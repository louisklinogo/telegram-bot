-- ============================================================================
-- TRANSACTIONS TABLE - Financial Movement Tracking
-- For complete financial visibility like Midday
-- ============================================================================

CREATE TABLE public.transactions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  
  -- References
  order_id UUID REFERENCES orders(id) ON DELETE SET NULL,
  invoice_id UUID REFERENCES invoices(id) ON DELETE SET NULL,
  client_id UUID REFERENCES clients(id) ON DELETE SET NULL,
  
  -- Transaction Information
  transaction_number VARCHAR(50) UNIQUE NOT NULL,
  type VARCHAR(50) NOT NULL, -- 'payment', 'expense', 'refund', 'adjustment'
  category VARCHAR(100), -- 'order_payment', 'fabric_purchase', 'supplies', 'salary', 'rent', etc.
  
  -- Amount & Currency
  amount NUMERIC(10,2) NOT NULL,
  currency VARCHAR(3) DEFAULT 'GHS' NOT NULL,
  
  -- Payment Details
  payment_method VARCHAR(50), -- 'cash', 'mobile_money', 'bank_transfer', 'card', etc.
  payment_reference VARCHAR(100), -- Reference number from payment provider
  
  -- Description
  description TEXT NOT NULL,
  notes TEXT,
  
  -- Dates
  transaction_date TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  due_date TIMESTAMPTZ,
  
  -- Status
  status VARCHAR(50) DEFAULT 'completed' NOT NULL, -- 'pending', 'completed', 'failed', 'cancelled'
  
  -- Metadata
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  deleted_at TIMESTAMPTZ
);

-- Constraints
ALTER TABLE transactions ADD CONSTRAINT check_positive_transaction_amount
  CHECK (amount > 0);

ALTER TABLE transactions ADD CONSTRAINT check_valid_transaction_type
  CHECK (type IN ('payment', 'expense', 'refund', 'adjustment'));

ALTER TABLE transactions ADD CONSTRAINT check_valid_transaction_status
  CHECK (status IN ('pending', 'completed', 'failed', 'cancelled'));

-- Indexes for performance
CREATE INDEX idx_transactions_client_id ON transactions(client_id);
CREATE INDEX idx_transactions_order_id ON transactions(order_id);
CREATE INDEX idx_transactions_invoice_id ON transactions(invoice_id);
CREATE INDEX idx_transactions_type ON transactions(type);
CREATE INDEX idx_transactions_date ON transactions(transaction_date DESC);
CREATE INDEX idx_transactions_status ON transactions(status);

-- Comments
COMMENT ON TABLE transactions IS 'Complete financial transaction history for payments, expenses, and refunds';
COMMENT ON COLUMN transactions.type IS 'Transaction type: payment (money in), expense (money out), refund, adjustment';
COMMENT ON COLUMN transactions.category IS 'Transaction category for reporting: order_payment, fabric_purchase, supplies, salary, rent, etc.';
COMMENT ON COLUMN transactions.payment_method IS 'How payment was made: cash, mobile_money, bank_transfer, card';
COMMENT ON COLUMN transactions.amount IS 'Transaction amount (always positive, type indicates direction)';

-- ============================================================================
-- Update Triggers
-- ============================================================================

-- Auto-update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER update_transactions_updated_at
    BEFORE UPDATE ON transactions
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at_column();

-- ============================================================================
-- Helper Views
-- ============================================================================

-- View for income (payments received)
CREATE OR REPLACE VIEW transactions_income AS
SELECT 
  t.*,
  c.name as client_name,
  o.order_number,
  i.invoice_number
FROM transactions t
LEFT JOIN clients c ON t.client_id = c.id
LEFT JOIN orders o ON t.order_id = o.id
LEFT JOIN invoices i ON t.invoice_id = i.id
WHERE t.type = 'payment' 
  AND t.status = 'completed'
  AND t.deleted_at IS NULL;

-- View for expenses (money out)
CREATE OR REPLACE VIEW transactions_expenses AS
SELECT 
  t.*,
  c.name as client_name
FROM transactions t
LEFT JOIN clients c ON t.client_id = c.id
WHERE t.type = 'expense' 
  AND t.status = 'completed'
  AND t.deleted_at IS NULL;

-- View for financial summary
CREATE OR REPLACE VIEW financial_summary AS
SELECT
  DATE_TRUNC('month', transaction_date) as month,
  SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END) as total_income,
  SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END) as total_expenses,
  SUM(CASE 
    WHEN type = 'payment' AND status = 'completed' THEN amount 
    WHEN type = 'expense' AND status = 'completed' THEN -amount 
    ELSE 0 
  END) as net_profit
FROM transactions
WHERE deleted_at IS NULL
GROUP BY month
ORDER BY month DESC;

COMMENT ON VIEW transactions_income IS 'All completed payment transactions (money in)';
COMMENT ON VIEW transactions_expenses IS 'All completed expense transactions (money out)';
COMMENT ON VIEW financial_summary IS 'Monthly financial summary: income, expenses, net profit';
