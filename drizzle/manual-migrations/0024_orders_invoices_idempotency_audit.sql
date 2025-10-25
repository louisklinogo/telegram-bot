-- 0024_orders_invoices_idempotency_audit.sql
-- Adds idempotency and audit columns for agent-driven workflows

-- Orders
ALTER TABLE public.orders
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS created_by_type text,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS conversation_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='orders' AND indexname='uniq_orders_team_idempotency'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_orders_team_idempotency ON public.orders (team_id, idempotency_key) WHERE idempotency_key IS NOT NULL';
  END IF;
END $$;

-- Invoices
ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS idempotency_key text,
  ADD COLUMN IF NOT EXISTS created_by_type text,
  ADD COLUMN IF NOT EXISTS created_by_id uuid,
  ADD COLUMN IF NOT EXISTS source text,
  ADD COLUMN IF NOT EXISTS conversation_id text;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_indexes WHERE schemaname='public' AND tablename='invoices' AND indexname='uniq_invoices_team_idempotency'
  ) THEN
    EXECUTE 'CREATE UNIQUE INDEX uniq_invoices_team_idempotency ON public.invoices (team_id, idempotency_key) WHERE idempotency_key IS NOT NULL';
  END IF;
END $$;
