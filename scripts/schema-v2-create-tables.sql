-- ============================================================================
-- SCHEMA V2 - Clean Database Structure
-- FaworraClothing Company - Admin Dashboard
-- ============================================================================
-- Run this after running schema-v2-drop-tables.sql
-- ============================================================================

-- Enable UUID extension
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS "pg_trgm"; -- For text search

-- ============================================================================
-- CLIENTS TABLE
-- ============================================================================
CREATE TABLE public.clients (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- Contact Information
  name TEXT NOT NULL,
  phone VARCHAR(50),
  whatsapp VARCHAR(50) NOT NULL,  -- Required for WhatsApp marketing
  email VARCHAR(255),
  address TEXT,
  
  -- Business Information
  referral_source TEXT,
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE clients ADD CONSTRAINT check_at_least_one_contact
  CHECK (phone IS NOT NULL OR whatsapp IS NOT NULL OR email IS NOT NULL);

COMMENT ON TABLE clients IS 'Customer/client information for tailoring business';
COMMENT ON COLUMN clients.whatsapp IS 'WhatsApp number (required) - used for marketing campaigns';
COMMENT ON COLUMN clients.phone IS 'Regular phone number (optional)';
COMMENT ON COLUMN clients.deleted_at IS 'Soft delete timestamp - NULL means active';

-- ============================================================================
-- ORDERS TABLE
-- ============================================================================
CREATE TABLE public.orders (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Order Information
  order_number VARCHAR(50) UNIQUE NOT NULL,
  status VARCHAR(50) DEFAULT 'generated' NOT NULL,
  
  -- Items & Pricing (JSONB structure documented below)
  items JSONB DEFAULT '[]'::JSONB NOT NULL,
  total_price NUMERIC(10,2) DEFAULT 0 NOT NULL,
  deposit_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  balance_amount NUMERIC(10,2) DEFAULT 0 NOT NULL,
  
  -- Additional Info
  notes TEXT,
  due_date TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  completed_at TIMESTAMPTZ,
  cancelled_at TIMESTAMPTZ,
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE orders ADD CONSTRAINT check_positive_amounts
  CHECK (total_price >= 0 AND deposit_amount >= 0 AND balance_amount >= 0);

ALTER TABLE orders ADD CONSTRAINT check_deposit_not_exceeding_total
  CHECK (deposit_amount <= total_price);

ALTER TABLE orders ADD CONSTRAINT check_valid_order_status
  CHECK (status IN ('generated', 'in_progress', 'completed', 'cancelled'));

COMMENT ON TABLE orders IS 'Tailoring orders with items and payment tracking';
COMMENT ON COLUMN orders.items IS 'JSONB array: [{name: string, quantity: number, unit_cost: number, total_cost: number}]';
COMMENT ON COLUMN orders.status IS 'Order status: generated, in_progress, completed, cancelled';
COMMENT ON COLUMN orders.total_price IS 'Total order price in Ghana Cedis (GHS)';
COMMENT ON COLUMN orders.deposit_amount IS 'Deposit paid in Ghana Cedis (GHS)';
COMMENT ON COLUMN orders.balance_amount IS 'Auto-calculated: total_price - deposit_amount (GHS)';

-- ============================================================================
-- INVOICES TABLE
-- ============================================================================
CREATE TABLE public.invoices (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  
  -- Invoice Information
  invoice_number VARCHAR(50) UNIQUE NOT NULL,
  amount NUMERIC(10,2) NOT NULL,
  status VARCHAR(50) DEFAULT 'pending' NOT NULL,
  
  -- Payment Information
  due_date TIMESTAMPTZ,
  paid_at TIMESTAMPTZ,
  invoice_url TEXT,
  
  -- Additional Info
  notes TEXT,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE invoices ADD CONSTRAINT check_positive_invoice_amount
  CHECK (amount > 0);

ALTER TABLE invoices ADD CONSTRAINT check_valid_invoice_status
  CHECK (status IN ('pending', 'sent', 'paid', 'overdue', 'cancelled'));

ALTER TABLE invoices ADD CONSTRAINT check_paid_status_requires_paid_at
  CHECK ((status = 'paid' AND paid_at IS NOT NULL) OR status != 'paid');

COMMENT ON TABLE invoices IS 'Invoices linked to orders for payment tracking';
COMMENT ON COLUMN invoices.status IS 'Invoice status: pending, sent, paid, overdue, cancelled';
COMMENT ON COLUMN invoices.paid_at IS 'Timestamp when payment was received (required when status=paid)';

-- ============================================================================
-- MEASUREMENTS TABLE
-- ============================================================================
CREATE TABLE public.measurements (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  client_id UUID REFERENCES clients(id) ON DELETE CASCADE NOT NULL,
  
  -- Measurement Information
  record_name VARCHAR(100),
  garment_type VARCHAR(50),
  measurements JSONB DEFAULT '{}'::JSONB NOT NULL,
  
  -- Additional Info
  notes TEXT,
  taken_at TIMESTAMPTZ,
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE measurements ADD CONSTRAINT check_valid_garment_type
  CHECK (garment_type IN ('suit', 'kaftan', 'shirt', 'trouser', 'agbada', 'two_piece') OR garment_type IS NULL);

COMMENT ON TABLE measurements IS 'Customer body measurements for tailoring';
COMMENT ON COLUMN measurements.garment_type IS 'Type: suit, kaftan, shirt, trouser, agbada, two_piece';
COMMENT ON COLUMN measurements.measurements IS 'JSONB object with measurement fields (see documentation)';

-- Measurements JSONB structure:
-- {
--   "chest": "40/42",        // CH - Required, can be dual value
--   "stomach": "38",         // ST - Optional
--   "waist": "32",           // WT - Required
--   "hip": "40",             // HP - Optional
--   "lap": "24",             // LP - Required
--   "neck": "16",            // NK - Required
--   "shoulder": "18",        // SH - Required
--   "top_length": "28/30",   // TL - Required, can be dual value
--   "trouser_length": "42",  // PL - Required
--   "sleeve_length": "24",   // SL - Required
--   "bicep_round": "14",     // BR - Required
--   "ankle_round": "10",     // AR - Required
--   "calf": "15"             // CF - Optional
-- }

-- ============================================================================
-- INDEXES
-- ============================================================================

-- Clients indexes
CREATE INDEX idx_clients_name ON clients(name);
CREATE INDEX idx_clients_phone ON clients(phone) WHERE phone IS NOT NULL;
CREATE INDEX idx_clients_whatsapp ON clients(whatsapp);
CREATE INDEX idx_clients_email ON clients(email) WHERE email IS NOT NULL;
CREATE INDEX idx_clients_deleted_at ON clients(deleted_at);
CREATE INDEX idx_clients_name_trgm ON clients USING gin(name gin_trgm_ops);

-- Orders indexes
CREATE INDEX idx_orders_client_id ON orders(client_id) WHERE client_id IS NOT NULL;
CREATE INDEX idx_orders_status ON orders(status);
CREATE INDEX idx_orders_order_number ON orders(order_number);
CREATE INDEX idx_orders_created_at ON orders(created_at DESC);
CREATE INDEX idx_orders_due_date ON orders(due_date) WHERE deleted_at IS NULL AND due_date IS NOT NULL;
CREATE INDEX idx_orders_deleted_at ON orders(deleted_at);
CREATE INDEX idx_orders_active_status ON orders(status, created_at DESC) WHERE deleted_at IS NULL;

-- Invoices indexes
CREATE INDEX idx_invoices_order_id ON invoices(order_id) WHERE order_id IS NOT NULL;
CREATE INDEX idx_invoices_status ON invoices(status);
CREATE INDEX idx_invoices_invoice_number ON invoices(invoice_number);
CREATE INDEX idx_invoices_created_at ON invoices(created_at DESC);
CREATE INDEX idx_invoices_unpaid ON invoices(due_date, status) WHERE status IN ('pending', 'overdue');
CREATE INDEX idx_invoices_deleted_at ON invoices(deleted_at);

-- Measurements indexes
CREATE INDEX idx_measurements_client_id ON measurements(client_id);
CREATE INDEX idx_measurements_garment_type ON measurements(garment_type) WHERE garment_type IS NOT NULL;
CREATE INDEX idx_measurements_taken_at ON measurements(taken_at DESC) WHERE taken_at IS NOT NULL;
CREATE INDEX idx_measurements_deleted_at ON measurements(deleted_at);

-- ============================================================================
-- TRIGGERS
-- ============================================================================

-- Function: Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Function: Auto-calculate balance_amount
CREATE OR REPLACE FUNCTION calculate_balance_amount()
RETURNS TRIGGER AS $$
BEGIN
  NEW.balance_amount = NEW.total_price - NEW.deposit_amount;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply updated_at triggers
CREATE TRIGGER update_clients_updated_at 
  BEFORE UPDATE ON clients
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_orders_updated_at 
  BEFORE UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_invoices_updated_at 
  BEFORE UPDATE ON invoices
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_measurements_updated_at 
  BEFORE UPDATE ON measurements
  FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Apply balance calculation trigger
CREATE TRIGGER calculate_orders_balance 
  BEFORE INSERT OR UPDATE ON orders
  FOR EACH ROW EXECUTE FUNCTION calculate_balance_amount();

-- ============================================================================
-- ROW LEVEL SECURITY (RLS)
-- ============================================================================

ALTER TABLE public.clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

-- RLS Policies (allow all for service role)
CREATE POLICY "Allow all operations for service role" ON public.clients
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON public.orders
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON public.invoices
  FOR ALL USING (true);

CREATE POLICY "Allow all operations for service role" ON public.measurements
  FOR ALL USING (true);

-- ============================================================================
-- COMPLETION MESSAGE
-- ============================================================================
SELECT 
  'Schema V2 created successfully!' as status,
  (SELECT COUNT(*) FROM information_schema.tables WHERE table_schema = 'public') as table_count,
  (SELECT COUNT(*) FROM information_schema.triggers WHERE trigger_schema = 'public') as trigger_count,
  (SELECT COUNT(*) FROM pg_indexes WHERE schemaname = 'public') as index_count;
