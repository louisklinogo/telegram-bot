-- Ensure exclude_from_analytics is fast and indexable
ALTER TABLE transactions ALTER COLUMN exclude_from_analytics SET DEFAULT false;
UPDATE transactions SET exclude_from_analytics = false WHERE exclude_from_analytics IS NULL;
ALTER TABLE transactions ALTER COLUMN exclude_from_analytics SET NOT NULL;

-- General ordering and range filters for recent and period queries
CREATE INDEX IF NOT EXISTS idx_transactions_team_date_id ON transactions (team_id, date DESC, id DESC) WHERE deleted_at IS NULL;

-- Stats filters (status/type/date) excluding non-analytic rows
CREATE INDEX IF NOT EXISTS idx_transactions_team_status_type_date ON transactions (team_id, status, type, date)
WHERE deleted_at IS NULL AND exclude_from_analytics IS NOT TRUE;

-- Spending by category (expense completed only)
CREATE INDEX IF NOT EXISTS idx_transactions_spending ON transactions (team_id, category_slug, date)
WHERE deleted_at IS NULL AND status = 'completed' AND type = 'expense' AND exclude_from_analytics IS NOT TRUE;
