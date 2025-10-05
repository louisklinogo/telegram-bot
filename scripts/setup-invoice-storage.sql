-- Create invoice-logos storage bucket
-- NOTE: If this fails, create the bucket manually in Supabase Dashboard
INSERT INTO storage.buckets (id, name, public)
VALUES ('invoice-logos', 'invoice-logos', true)
ON CONFLICT (id) DO NOTHING;

-- RLS is already enabled on storage.objects by default in Supabase
-- No need to run: ALTER TABLE storage.objects ENABLE ROW LEVEL SECURITY;

-- Drop existing policies if they exist
DROP POLICY IF EXISTS "Users can upload logos to their team folder" ON storage.objects;
DROP POLICY IF EXISTS "Users can read all logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can delete their team logos" ON storage.objects;
DROP POLICY IF EXISTS "Users can update their team logos" ON storage.objects;

-- Policy: Allow authenticated users to upload logos to their team folder
CREATE POLICY "Users can upload logos to their team folder"
ON storage.objects
FOR INSERT
TO authenticated
WITH CHECK (
  bucket_id = 'invoice-logos' AND
  (storage.foldername(name))[1] = (
    SELECT current_team_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

-- Policy: Allow authenticated users to read all logos (for viewing invoices)
CREATE POLICY "Users can read all logos"
ON storage.objects
FOR SELECT
TO authenticated
USING (bucket_id = 'invoice-logos');

-- Policy: Users can delete their own team's logos
CREATE POLICY "Users can delete their team logos"
ON storage.objects
FOR DELETE
TO authenticated
USING (
  bucket_id = 'invoice-logos' AND
  (storage.foldername(name))[1] = (
    SELECT current_team_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);

-- Policy: Users can update their team's logos
CREATE POLICY "Users can update their team logos"
ON storage.objects
FOR UPDATE
TO authenticated
USING (
  bucket_id = 'invoice-logos' AND
  (storage.foldername(name))[1] = (
    SELECT current_team_id::text 
    FROM public.users 
    WHERE id = auth.uid()
  )
);
