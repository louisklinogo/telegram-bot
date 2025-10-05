-- Add exclude_from_analytics flag to transactions
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 
    FROM information_schema.columns 
    WHERE table_name = 'transactions' AND column_name = 'exclude_from_analytics'
  ) THEN
    ALTER TABLE transactions
      ADD COLUMN exclude_from_analytics boolean DEFAULT false NOT NULL;
  END IF;
END $$;
