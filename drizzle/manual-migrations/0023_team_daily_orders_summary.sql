-- 0023_team_daily_orders_summary.sql
-- Creates team_daily_orders_summary, trigger maintenance, and backfills

CREATE TABLE IF NOT EXISTS public.team_daily_orders_summary (
  team_id uuid NOT NULL,
  day date NOT NULL,
  created_count int NOT NULL DEFAULT 0,
  created_count_excl_cancelled int NOT NULL DEFAULT 0,
  created_value_sum_excl_cancelled numeric(12,2) NOT NULL DEFAULT 0,
  completed_count int NOT NULL DEFAULT 0,
  completed_value_sum numeric(12,2) NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, day)
);

CREATE OR REPLACE FUNCTION public.add_daily_orders_delta(
  p_team_id uuid,
  p_day date,
  p_created int,
  p_created_nc int,
  p_created_val numeric,
  p_completed int,
  p_completed_val numeric
) RETURNS void LANGUAGE sql AS $$
INSERT INTO public.team_daily_orders_summary
  (team_id, day, created_count, created_count_excl_cancelled, created_value_sum_excl_cancelled, completed_count, completed_value_sum)
VALUES
  (p_team_id, p_day, COALESCE(p_created,0), COALESCE(p_created_nc,0), COALESCE(p_created_val,0), COALESCE(p_completed,0), COALESCE(p_completed_val,0))
ON CONFLICT (team_id, day) DO UPDATE SET
  created_count = team_daily_orders_summary.created_count + COALESCE(EXCLUDED.created_count,0),
  created_count_excl_cancelled = team_daily_orders_summary.created_count_excl_cancelled + COALESCE(EXCLUDED.created_count_excl_cancelled,0),
  created_value_sum_excl_cancelled = team_daily_orders_summary.created_value_sum_excl_cancelled + COALESCE(EXCLUDED.created_value_sum_excl_cancelled,0),
  completed_count = team_daily_orders_summary.completed_count + COALESCE(EXCLUDED.completed_count,0),
  completed_value_sum = team_daily_orders_summary.completed_value_sum + COALESCE(EXCLUDED.completed_value_sum,0),
  updated_at = now();
$$;

CREATE OR REPLACE FUNCTION public.apply_team_daily_orders_summary()
RETURNS trigger LANGUAGE plpgsql AS $$
DECLARE
  old_day date;
  new_day date;
  old_completed_day date;
  new_completed_day date;
BEGIN
  IF TG_OP = 'INSERT' THEN
    new_day := (NEW.created_at)::date;
    PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 1, CASE WHEN NEW.status <> 'cancelled' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END, CASE WHEN NEW.status <> 'cancelled' AND NEW.deleted_at IS NULL THEN COALESCE(NEW.total_price,0) ELSE 0 END, 0, 0);
    IF NEW.status = 'completed' AND NEW.completed_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      new_completed_day := (NEW.completed_at)::date;
      PERFORM public.add_daily_orders_delta(NEW.team_id, new_completed_day, 0, 0, 0, 1, COALESCE(NEW.total_price,0));
    END IF;
    RETURN NEW;
  ELSIF TG_OP = 'UPDATE' THEN
    old_day := (OLD.created_at)::date;
    new_day := (NEW.created_at)::date;

    IF OLD.deleted_at IS NULL AND NEW.deleted_at IS NOT NULL THEN
      PERFORM public.add_daily_orders_delta(NEW.team_id, old_day, -1, CASE WHEN OLD.status <> 'cancelled' THEN -1 ELSE 0 END, CASE WHEN OLD.status <> 'cancelled' THEN -COALESCE(OLD.total_price,0) ELSE 0 END, 0, 0);
    ELSIF OLD.deleted_at IS NOT NULL AND NEW.deleted_at IS NULL THEN
      PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 1, CASE WHEN NEW.status <> 'cancelled' THEN 1 ELSE 0 END, CASE WHEN NEW.status <> 'cancelled' THEN COALESCE(NEW.total_price,0) ELSE 0 END, 0, 0);
    END IF;

    IF new_day <> old_day THEN
      PERFORM public.add_daily_orders_delta(NEW.team_id, old_day, -1, CASE WHEN OLD.status <> 'cancelled' AND OLD.deleted_at IS NULL THEN -1 ELSE 0 END, CASE WHEN OLD.status <> 'cancelled' AND OLD.deleted_at IS NULL THEN -COALESCE(OLD.total_price,0) ELSE 0 END, 0, 0);
      PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 1, CASE WHEN NEW.status <> 'cancelled' AND NEW.deleted_at IS NULL THEN 1 ELSE 0 END, CASE WHEN NEW.status <> 'cancelled' AND NEW.deleted_at IS NULL THEN COALESCE(NEW.total_price,0) ELSE 0 END, 0, 0);
    ELSE
      IF (OLD.status <> NEW.status) THEN
        IF OLD.status <> 'cancelled' AND NEW.status = 'cancelled' THEN
          PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 0, -1, -COALESCE(OLD.total_price,0), 0, 0);
        ELSIF OLD.status = 'cancelled' AND NEW.status <> 'cancelled' THEN
          PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 0, 1, COALESCE(NEW.total_price,0), 0, 0);
        END IF;
      END IF;
      IF (NEW.total_price IS DISTINCT FROM OLD.total_price) AND NEW.deleted_at IS NULL AND NEW.status <> 'cancelled' THEN
        PERFORM public.add_daily_orders_delta(NEW.team_id, new_day, 0, 0, COALESCE(NEW.total_price,0) - COALESCE(OLD.total_price,0), 0, 0);
      END IF;
    END IF;

    old_completed_day := CASE WHEN OLD.status='completed' AND OLD.completed_at IS NOT NULL AND OLD.deleted_at IS NULL THEN (OLD.completed_at)::date ELSE NULL END;
    new_completed_day := CASE WHEN NEW.status='completed' AND NEW.completed_at IS NOT NULL AND NEW.deleted_at IS NULL THEN (NEW.completed_at)::date ELSE NULL END;
    IF (old_completed_day IS DISTINCT FROM new_completed_day) THEN
      IF old_completed_day IS NOT NULL THEN
        PERFORM public.add_daily_orders_delta(NEW.team_id, old_completed_day, 0, 0, 0, -1, -COALESCE(OLD.total_price,0));
      END IF;
      IF new_completed_day IS NOT NULL THEN
        PERFORM public.add_daily_orders_delta(NEW.team_id, new_completed_day, 0, 0, 0, 1, COALESCE(NEW.total_price,0));
      END IF;
    ELSE
      IF new_completed_day IS NOT NULL AND (NEW.total_price IS DISTINCT FROM OLD.total_price) THEN
        PERFORM public.add_daily_orders_delta(NEW.team_id, new_completed_day, 0, 0, 0, 0, COALESCE(NEW.total_price,0) - COALESCE(OLD.total_price,0));
      END IF;
    END IF;
    RETURN NEW;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_orders_daily_summary' AND tgrelid='public.orders'::regclass) THEN
    EXECUTE 'DROP TRIGGER trg_orders_daily_summary ON public.orders';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_orders_daily_summary AFTER INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.apply_team_daily_orders_summary()';
END$$;

INSERT INTO public.team_daily_orders_summary (team_id, day, created_count, created_count_excl_cancelled, created_value_sum_excl_cancelled)
SELECT team_id, (created_at)::date AS day, COUNT(*)::int, COUNT(*) FILTER (WHERE status <> 'cancelled' AND deleted_at IS NULL)::int, COALESCE(SUM(CASE WHEN status <> 'cancelled' AND deleted_at IS NULL THEN total_price ELSE 0 END),0)::numeric(12,2)
FROM public.orders
GROUP BY team_id, (created_at)::date
ON CONFLICT (team_id, day) DO UPDATE SET
  created_count = EXCLUDED.created_count,
  created_count_excl_cancelled = EXCLUDED.created_count_excl_cancelled,
  created_value_sum_excl_cancelled = EXCLUDED.created_value_sum_excl_cancelled,
  updated_at = now();

INSERT INTO public.team_daily_orders_summary (team_id, day, completed_count, completed_value_sum)
SELECT team_id, (completed_at)::date AS day, COUNT(*)::int, COALESCE(SUM(total_price),0)::numeric(12,2)
FROM public.orders
WHERE status='completed' AND completed_at IS NOT NULL AND deleted_at IS NULL
GROUP BY team_id, (completed_at)::date
ON CONFLICT (team_id, day) DO UPDATE SET
  completed_count = EXCLUDED.completed_count,
  completed_value_sum = EXCLUDED.completed_value_sum,
  updated_at = now();
