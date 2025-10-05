-- Migration 002: Add invoice_items table and enhance invoices table
-- Purpose: Support detailed invoice line items and better payment tracking

-- 1. Add invoice_items table (snapshot of order items at invoice time)
CREATE TABLE IF NOT EXISTS invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES invoices(id) ON DELETE CASCADE,
    order_item_id UUID REFERENCES order_items(id) ON DELETE SET NULL,
    name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    total NUMERIC(10, 2) NOT NULL DEFAULT 0,
    created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- Add index for faster queries
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);

-- 2. Add new fields to invoices table
ALTER TABLE invoices 
    ADD COLUMN IF NOT EXISTS subtotal NUMERIC(10, 2),
    ADD COLUMN IF NOT EXISTS tax NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS discount NUMERIC(10, 2) DEFAULT 0,
    ADD COLUMN IF NOT EXISTS sent_at TIMESTAMPTZ;

-- 3. Backfill subtotal for existing invoices (subtotal = amount if not set)
UPDATE invoices 
SET subtotal = amount 
WHERE subtotal IS NULL;

-- 4. Make subtotal NOT NULL after backfill
ALTER TABLE invoices 
    ALTER COLUMN subtotal SET NOT NULL;

-- 5. Add index for sent_at (useful for filtering sent invoices)
CREATE INDEX IF NOT EXISTS idx_invoices_sent_at ON invoices(sent_at);

-- 6. Update invoice status enum to include new statuses
-- Note: PostgreSQL doesn't have ALTER TYPE, so we'll handle this in the application layer
-- Valid statuses: 'draft', 'sent', 'partially_paid', 'paid', 'overdue', 'cancelled'

COMMENT ON TABLE invoice_items IS 'Line items for invoices - snapshot from order_items at invoice creation time';
COMMENT ON COLUMN invoices.subtotal IS 'Invoice subtotal before tax and discount';
COMMENT ON COLUMN invoices.tax IS 'Tax amount (e.g., VAT/NHIL)';
COMMENT ON COLUMN invoices.discount IS 'Discount amount';
COMMENT ON COLUMN invoices.sent_at IS 'When invoice was sent to client (makes it immutable)';
