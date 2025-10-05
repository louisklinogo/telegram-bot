-- Create financial accounts table and link to transactions

CREATE TABLE IF NOT EXISTS public.financial_accounts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id uuid NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  type varchar(32) NOT NULL,
  name text NOT NULL,
  currency varchar(3) NOT NULL DEFAULT 'GHS',
  provider varchar(64),
  external_id text,
  status varchar(32) NOT NULL DEFAULT 'active',
  opening_balance numeric(12,2),
  sync_cursor text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

-- Helpful indexes
CREATE INDEX IF NOT EXISTS idx_fin_accounts_team_id ON public.financial_accounts (team_id);
CREATE INDEX IF NOT EXISTS uq_fin_accounts_team_name ON public.financial_accounts (team_id, name);
CREATE INDEX IF NOT EXISTS uq_fin_accounts_team_provider_external ON public.financial_accounts (team_id, provider, external_id);
CREATE INDEX IF NOT EXISTS idx_fin_accounts_status ON public.financial_accounts (status);

-- Link transactions to accounts (nullable to keep compatibility)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'transactions' AND column_name = 'account_id'
  ) THEN
    ALTER TABLE public.transactions
      ADD COLUMN account_id uuid NULL;
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'transactions_account_id_financial_accounts_id_fk'
  ) THEN
    ALTER TABLE public.transactions
      ADD CONSTRAINT transactions_account_id_financial_accounts_id_fk
      FOREIGN KEY (account_id) REFERENCES public.financial_accounts(id) ON DELETE SET NULL;
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS idx_transactions_account_id ON public.transactions (account_id);
