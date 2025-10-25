-- 0021_orders_numbering.sql
-- Idempotent migration to enable per-team sequential order numbers in Postgres

-- 1) Counters table for per-team per-year sequence
CREATE TABLE IF NOT EXISTS public.team_order_counters (
  team_id uuid NOT NULL,
  year int NOT NULL,
  counter int NOT NULL DEFAULT 0,
  updated_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (team_id, year)
);

-- 2) Function to generate next order number with advisory lock
CREATE OR REPLACE FUNCTION public.next_order_number(p_team_id uuid)
RETURNS text
LANGUAGE plpgsql
AS $$
DECLARE
  v_year int := EXTRACT(YEAR FROM now())::int;
  v_next int;
BEGIN
  PERFORM pg_advisory_xact_lock(hashtextextended(p_team_id::text, 0));

  INSERT INTO public.team_order_counters(team_id, year, counter)
  VALUES (p_team_id, v_year, 1)
  ON CONFLICT (team_id, year)
  DO UPDATE SET counter = public.team_order_counters.counter + 1, updated_at = now()
  RETURNING counter INTO v_next;

  RETURN 'ORD-' || v_year::text || '-' || to_char(v_next, 'FM0000');
END;
$$;

-- 3) BEFORE INSERT trigger function to set order_number if missing
CREATE OR REPLACE FUNCTION public.before_insert_orders_set_number()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF NEW.order_number IS NULL OR NEW.order_number = '' THEN
    NEW.order_number := public.next_order_number(NEW.team_id);
  END IF;
  RETURN NEW;
END;
$$;

-- 4) Create trigger if not exists
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_trigger
    WHERE tgname = 'trg_orders_set_number'
      AND tgrelid = 'public.orders'::regclass
  ) THEN
    CREATE TRIGGER trg_orders_set_number
    BEFORE INSERT ON public.orders
    FOR EACH ROW
    EXECUTE FUNCTION public.before_insert_orders_set_number();
  END IF;
END
$$;

-- 5) Ensure uniqueness is per-team (drop global unique index, add composite unique index)
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orders' AND indexname='orders_order_number_key'
  ) THEN
    EXECUTE 'DROP INDEX public.orders_order_number_key';
  END IF;
END $$;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='orders' AND indexname='uniq_orders_team_order_number'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_orders_team_order_number ON public.orders (team_id, order_number)';
  END IF;
END $$;
