-- Schema Performance Improvements (idempotent)
-- This migration adds composite/GIN indexes recommended by recent analysis.

-- Enable trigram extension for ILIKE performance (safe if already enabled)
CREATE EXTENSION IF NOT EXISTS pg_trgm;

-- 1) Transactions: common filters with date sort
CREATE INDEX IF NOT EXISTS idx_transactions_team_category_date
  ON public.transactions (team_id, category_slug, date DESC)
  WHERE category_slug IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_team_assigned_date
  ON public.transactions (team_id, assigned_id, date DESC)
  WHERE assigned_id IS NOT NULL AND deleted_at IS NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_team_account_date
  ON public.transactions (team_id, account_id, date DESC)
  WHERE account_id IS NOT NULL AND deleted_at IS NULL;

-- 2) Orders: cursor pagination (team, created_at DESC, id DESC) and soft-delete filter
CREATE INDEX IF NOT EXISTS idx_orders_team_created_cursor
  ON public.orders (team_id, created_at DESC, id DESC)
  WHERE deleted_at IS NULL;

-- 3) Invoices: enforce per-team invoice number uniqueness
DO $$
BEGIN
  -- Drop non-unique index if it exists (created by earlier schema versions)
  IF EXISTS (
    SELECT 1 FROM pg_indexes
    WHERE schemaname='public' AND tablename='invoices' AND indexname='uq_invoices_team_invoice'
  ) THEN
    EXECUTE 'DROP INDEX public.uq_invoices_team_invoice';
  END IF;
END $$;

CREATE UNIQUE INDEX IF NOT EXISTS uniq_invoices_team_invoice
  ON public.invoices (team_id, invoice_number);

-- 4) Clients: GIN trigram indexes for fast ILIKE search
CREATE INDEX IF NOT EXISTS idx_clients_phone_trgm
  ON public.clients USING GIN (phone gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_whatsapp_trgm
  ON public.clients USING GIN (whatsapp gin_trgm_ops);

CREATE INDEX IF NOT EXISTS idx_clients_email_trgm
  ON public.clients USING GIN (email gin_trgm_ops);

-- 5) Documents: array column benefits from GIN for containment queries
CREATE INDEX IF NOT EXISTS idx_documents_path_tokens_gin
  ON public.documents USING GIN (path_tokens);

-- 6) Measurements: tags array -> GIN
CREATE INDEX IF NOT EXISTS idx_measurements_tags_gin
  ON public.measurements USING GIN (tags);
