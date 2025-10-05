-- 0014_add_transaction_indexes.sql
-- Codify critical transactions indexes for reproducible performance

-- Team/date composite (reporting & default sorting)
CREATE INDEX IF NOT EXISTS idx_transactions_team_date
  ON public.transactions (team_id, date DESC);

-- Single-column dates
CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date
  ON public.transactions (transaction_date DESC);

-- Status/type composites (dashboards and filters)
CREATE INDEX IF NOT EXISTS idx_transactions_status
  ON public.transactions (status);

CREATE INDEX IF NOT EXISTS idx_transactions_team_status_date
  ON public.transactions (team_id, status, date DESC);

CREATE INDEX IF NOT EXISTS idx_transactions_team_type_date
  ON public.transactions (team_id, type, date DESC);

-- Ownership and lookups
CREATE INDEX IF NOT EXISTS idx_transactions_assigned_id
  ON public.transactions (assigned_id)
  WHERE assigned_id IS NOT NULL;

CREATE INDEX IF NOT EXISTS idx_transactions_client_id
  ON public.transactions (client_id);

CREATE INDEX IF NOT EXISTS idx_transactions_account_id
  ON public.transactions (account_id);

-- Category filter (nullable)
CREATE INDEX IF NOT EXISTS idx_transactions_category_slug
  ON public.transactions (category_slug)
  WHERE category_slug IS NOT NULL;

-- Document links
CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id
  ON public.transactions (invoice_id);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id
  ON public.transactions (order_id);

-- Pagination path (infinite scroll)
CREATE INDEX IF NOT EXISTS idx_transactions_team_pagination
  ON public.transactions (team_id, date DESC, id DESC)
  WHERE deleted_at IS NULL;

-- Soft-deleted purge queries
CREATE INDEX IF NOT EXISTS idx_transactions_team_deleted_date
  ON public.transactions (team_id, deleted_at, transaction_date DESC);
