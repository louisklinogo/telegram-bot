-- 0022_order_status_timestamps.sql
-- Idempotent migration to set completed_at/cancelled_at automatically based on status

CREATE OR REPLACE FUNCTION public.set_order_status_timestamps()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    IF NEW.status = 'completed' AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status = 'cancelled' AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  ELSIF TG_OP = 'UPDATE' THEN
    IF NEW.status = 'completed' AND (OLD.status IS DISTINCT FROM 'completed') AND NEW.completed_at IS NULL THEN
      NEW.completed_at := now();
    END IF;
    IF NEW.status = 'cancelled' AND (OLD.status IS DISTINCT FROM 'cancelled') AND NEW.cancelled_at IS NULL THEN
      NEW.cancelled_at := now();
    END IF;
  END IF;
  RETURN NEW;
END;
$$;

DO $$
BEGIN
  IF EXISTS (SELECT 1 FROM pg_trigger WHERE tgname='trg_orders_status_timestamps' AND tgrelid='public.orders'::regclass) THEN
    EXECUTE 'DROP TRIGGER trg_orders_status_timestamps ON public.orders';
  END IF;
  EXECUTE 'CREATE TRIGGER trg_orders_status_timestamps BEFORE INSERT OR UPDATE ON public.orders FOR EACH ROW EXECUTE FUNCTION public.set_order_status_timestamps()';
END$$;

-- Backfill existing rows once
UPDATE public.orders
SET completed_at = COALESCE(completed_at, updated_at, created_at)
WHERE status = 'completed' AND completed_at IS NULL;

UPDATE public.orders
SET cancelled_at = COALESCE(cancelled_at, updated_at, created_at)
WHERE status = 'cancelled' AND cancelled_at IS NULL;
