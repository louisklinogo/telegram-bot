-- Invoice status enum rework: add draft and partially_paid, replace pending with draft
-- Safe migration compatible with Postgres enum limitations

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_type WHERE typname = 'invoice_status_v2'
  ) THEN
    CREATE TYPE "public"."invoice_status_v2" AS ENUM (
      'draft',
      'sent',
      'partially_paid',
      'paid',
      'overdue',
      'cancelled'
    );
  END IF;
END $$;

-- Ensure no default blocks type alteration
ALTER TABLE "public"."invoices" ALTER COLUMN "status" DROP DEFAULT;

-- Convert existing values; map 'pending' -> 'draft'
ALTER TABLE "public"."invoices"
  ALTER COLUMN "status" TYPE "public"."invoice_status_v2"
  USING (
    CASE "status"::text
      WHEN 'pending' THEN 'draft'
      ELSE "status"::text
    END
  )::"public"."invoice_status_v2";

-- Set new default
ALTER TABLE "public"."invoices" ALTER COLUMN "status" SET DEFAULT 'draft';

-- Rename old type and swap names so the canonical name remains invoice_status
DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status') THEN
    ALTER TYPE "public"."invoice_status" RENAME TO "invoice_status_old";
  END IF;
END $$;

ALTER TYPE "public"."invoice_status_v2" RENAME TO "invoice_status";

DO $$ BEGIN
  IF EXISTS (SELECT 1 FROM pg_type WHERE typname = 'invoice_status_old') THEN
    DROP TYPE "public"."invoice_status_old";
  END IF;
END $$;

-- Optional: re-apply index if needed (kept as-is since column unchanged)
-- CREATE INDEX IF NOT EXISTS idx_invoices_status ON public.invoices (status);
