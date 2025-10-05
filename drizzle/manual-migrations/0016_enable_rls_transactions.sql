-- 0016_enable_rls_transactions.sql
-- Enable RLS and add team_id-scoped policies for transaction_tags and transaction_attachments

-- Enable RLS (idempotent)
ALTER TABLE public.transaction_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.transaction_attachments ENABLE ROW LEVEL SECURITY;

-- transaction_tags policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_tags' AND p.polname = 'team_select_transaction_tags'
  ) THEN
    CREATE POLICY team_select_transaction_tags
      ON public.transaction_tags FOR SELECT
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_tags' AND p.polname = 'team_insert_transaction_tags'
  ) THEN
    CREATE POLICY team_insert_transaction_tags
      ON public.transaction_tags FOR INSERT
      WITH CHECK (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_tags' AND p.polname = 'team_update_transaction_tags'
  ) THEN
    CREATE POLICY team_update_transaction_tags
      ON public.transaction_tags FOR UPDATE
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      )
      WITH CHECK (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_tags' AND p.polname = 'team_delete_transaction_tags'
  ) THEN
    CREATE POLICY team_delete_transaction_tags
      ON public.transaction_tags FOR DELETE
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
END $$;

-- transaction_attachments policies
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_attachments' AND p.polname = 'team_select_transaction_attachments'
  ) THEN
    CREATE POLICY team_select_transaction_attachments
      ON public.transaction_attachments FOR SELECT
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_attachments' AND p.polname = 'team_insert_transaction_attachments'
  ) THEN
    CREATE POLICY team_insert_transaction_attachments
      ON public.transaction_attachments FOR INSERT
      WITH CHECK (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_attachments' AND p.polname = 'team_update_transaction_attachments'
  ) THEN
    CREATE POLICY team_update_transaction_attachments
      ON public.transaction_attachments FOR UPDATE
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      )
      WITH CHECK (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'transaction_attachments' AND p.polname = 'team_delete_transaction_attachments'
  ) THEN
    CREATE POLICY team_delete_transaction_attachments
      ON public.transaction_attachments FOR DELETE
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
END $$;
