-- Adds a composite index to speed amount range filters scoped by team
CREATE INDEX IF NOT EXISTS idx_transactions_team_amount
  ON public.transactions (team_id, amount);
