-- Create product-media storage bucket (public read) and RLS policies for team-scoped writes

DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM storage.buckets WHERE id = 'product-media') THEN
    BEGIN
      PERFORM storage.create_bucket('product-media', true);
    EXCEPTION WHEN undefined_function THEN
      INSERT INTO storage.buckets (id, name, public) VALUES ('product-media', 'product-media', true);
    END;
  END IF;
END $$;

-- Public read for product-media objects
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Public read product-media'
  ) THEN
    CREATE POLICY "Public read product-media"
      ON storage.objects
      FOR SELECT
      USING (bucket_id = 'product-media');
  END IF;
END $$;

-- Authenticated users can upload into their team folder: <teamId>/productId/...
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Team upload product-media'
  ) THEN
    CREATE POLICY "Team upload product-media"
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'product-media'
        AND EXISTS (
          SELECT 1
          FROM public.users u
          WHERE u.id = auth.uid()
            AND (name LIKE (u.current_team_id || '/%'))
        )
      );
  END IF;
END $$;

-- Authenticated users can update objects within their team folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Team update product-media'
  ) THEN
    CREATE POLICY "Team update product-media"
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'product-media'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND (name LIKE (u.current_team_id || '/%'))
        )
      )
      WITH CHECK (
        bucket_id = 'product-media'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND (name LIKE (u.current_team_id || '/%'))
        )
      );
  END IF;
END $$;

-- Authenticated users can delete objects within their team folder
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'Team delete product-media'
  ) THEN
    CREATE POLICY "Team delete product-media"
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'product-media'
        AND EXISTS (
          SELECT 1 FROM public.users u
          WHERE u.id = auth.uid()
            AND (name LIKE (u.current_team_id || '/%'))
        )
      );
  END IF;
END $$;
