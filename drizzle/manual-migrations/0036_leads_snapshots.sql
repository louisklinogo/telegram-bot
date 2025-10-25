-- Add immutable prospect snapshot fields to leads
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prospect_name text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prospect_phone varchar(50);
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS prospect_handle text;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS whatsapp_contact_id uuid;
ALTER TABLE public.leads ADD COLUMN IF NOT EXISTS instagram_contact_id uuid;

-- Add FKs if missing
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_whatsapp_contact_fk'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_whatsapp_contact_fk
      FOREIGN KEY (whatsapp_contact_id)
      REFERENCES public.whatsapp_contacts(id)
      ON DELETE SET NULL;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'leads_instagram_contact_fk'
  ) THEN
    ALTER TABLE public.leads
      ADD CONSTRAINT leads_instagram_contact_fk
      FOREIGN KEY (instagram_contact_id)
      REFERENCES public.instagram_contacts(id)
      ON DELETE SET NULL;
  END IF;
END $$;

-- Backfill snapshots from existing links
UPDATE public.leads AS l
SET 
  prospect_name = COALESCE(c.name, w.display_name, i.display_name, t.external_contact_id, l.prospect_name),
  prospect_phone = COALESCE(c.whatsapp, c.phone, w.phone, l.prospect_phone),
  prospect_handle = COALESCE(i.username, l.prospect_handle),
  whatsapp_contact_id = COALESCE(l.whatsapp_contact_id, t.whatsapp_contact_id),
  instagram_contact_id = COALESCE(l.instagram_contact_id, t.instagram_contact_id),
  updated_at = now()
FROM public.communication_threads t
LEFT JOIN public.clients c ON c.id = t.customer_id
LEFT JOIN public.whatsapp_contacts w ON w.id = t.whatsapp_contact_id
LEFT JOIN public.instagram_contacts i ON i.id = t.instagram_contact_id
WHERE t.id = l.thread_id AND t.team_id = l.team_id
  AND (
    l.prospect_name IS NULL
    OR l.prospect_phone IS NULL
    OR (l.prospect_handle IS NULL AND i.username IS NOT NULL)
    OR (l.whatsapp_contact_id IS NULL AND t.whatsapp_contact_id IS NOT NULL)
    OR (l.instagram_contact_id IS NULL AND t.instagram_contact_id IS NOT NULL)
  );
