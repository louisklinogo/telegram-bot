-- Enable RLS and team-scoped policies for leads

ALTER TABLE public.leads ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'leads' AND p.polname = 'team_select_leads'
  ) THEN
    CREATE POLICY team_select_leads
      ON public.leads FOR SELECT
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'leads' AND p.polname = 'team_insert_leads'
  ) THEN
    CREATE POLICY team_insert_leads
      ON public.leads FOR INSERT
      WITH CHECK (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policy p
    JOIN pg_class c ON c.oid = p.polrelid
    JOIN pg_namespace n ON n.oid = c.relnamespace
    WHERE n.nspname = 'public' AND c.relname = 'leads' AND p.polname = 'team_update_leads'
  ) THEN
    CREATE POLICY team_update_leads
      ON public.leads FOR UPDATE
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
    WHERE n.nspname = 'public' AND c.relname = 'leads' AND p.polname = 'team_delete_leads'
  ) THEN
    CREATE POLICY team_delete_leads
      ON public.leads FOR DELETE
      USING (
        team_id = (SELECT current_team_id FROM public.users WHERE id = auth.uid())
      );
  END IF;
END $$;
