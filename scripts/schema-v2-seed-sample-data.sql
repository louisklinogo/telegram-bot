-- ============================================================================
-- SCHEMA V2 - Sample Seed Data
-- ============================================================================
-- Run this after schema-v2-create-tables.sql for testing
-- ============================================================================

-- ============================================================================
-- SAMPLE CLIENTS
-- ============================================================================
INSERT INTO public.clients (name, phone, whatsapp, email, address, referral_source, notes) VALUES
('Kwame Mensah', '+233244123456', '+233244123456', 'kwame.mensah@gmail.com', '123 Osu Street, Accra', 'Instagram', 'VIP client, prefers kaftans'),
('Ama Asante', NULL, '+233201234567', 'ama.asante@yahoo.com', '45 Labone Road, Accra', 'Referral', 'Regular customer for suits'),
('Kofi Boateng', '+233277654321', '+233277654321', NULL, '78 Tema Avenue, Tema', 'Facebook', NULL),
('Akua Owusu', '+233246789012', '+233501234567', 'akua@gmail.com', '12 Kumasi Plaza, Kumasi', 'Word of Mouth', 'Needs measurements updated'),
('Yaw Appiah', NULL, '+233559876543', 'yaw.appiah@hotmail.com', '90 Takoradi Street, Takoradi', 'Instagram', 'Business client - bulk orders');

-- ============================================================================
-- SAMPLE MEASUREMENTS
-- ============================================================================
INSERT INTO public.measurements (client_id, record_name, garment_type, measurements, taken_at, notes) VALUES
(
  (SELECT id FROM clients WHERE name = 'Kwame Mensah'),
  'Wedding Kaftan 2024',
  'kaftan',
  '{
    "chest": "42/44",
    "waist": "36",
    "lap": "24",
    "neck": "16.5",
    "shoulder": "19",
    "top_length": "48/50",
    "trouser_length": "42",
    "sleeve_length": "25",
    "bicep_round": "15",
    "ankle_round": "11",
    "stomach": "40"
  }'::jsonb,
  NOW() - INTERVAL '30 days',
  'Measured for wedding ceremony'
),
(
  (SELECT id FROM clients WHERE name = 'Ama Asante'),
  'Business Suit Measurements',
  'suit',
  '{
    "chest": "38",
    "waist": "32",
    "lap": "22",
    "neck": "15",
    "shoulder": "17",
    "top_length": "28",
    "trouser_length": "40",
    "sleeve_length": "24",
    "bicep_round": "13",
    "ankle_round": "9",
    "hip": "38"
  }'::jsonb,
  NOW() - INTERVAL '15 days',
  'Standard business suit measurements'
),
(
  (SELECT id FROM clients WHERE name = 'Kofi Boateng'),
  'Casual Shirt',
  'shirt',
  '{
    "chest": "44",
    "waist": "38",
    "neck": "17",
    "shoulder": "20",
    "sleeve_length": "26",
    "bicep_round": "16",
    "lap": "25",
    "top_length": "30",
    "trouser_length": "43",
    "ankle_round": "12"
  }'::jsonb,
  NOW() - INTERVAL '7 days',
  NULL
);

-- ============================================================================
-- SAMPLE ORDERS
-- ============================================================================
INSERT INTO public.orders (client_id, order_number, status, items, total_price, deposit_amount, due_date, notes) VALUES
(
  (SELECT id FROM clients WHERE name = 'Kwame Mensah'),
  'ORD-2024-001',
  'in_progress',
  '[
    {"name": "Wedding Kaftan", "quantity": 1, "unit_cost": 450.00, "total_cost": 450.00},
    {"name": "Matching Trousers", "quantity": 1, "unit_cost": 150.00, "total_cost": 150.00}
  ]'::jsonb,
  600.00,
  300.00,
  NOW() + INTERVAL '14 days',
  'Rush order for wedding'
),
(
  (SELECT id FROM clients WHERE name = 'Ama Asante'),
  'ORD-2024-002',
  'generated',
  '[
    {"name": "Business Suit - Navy", "quantity": 1, "unit_cost": 850.00, "total_cost": 850.00},
    {"name": "White Dress Shirt", "quantity": 2, "unit_cost": 80.00, "total_cost": 160.00}
  ]'::jsonb,
  1010.00,
  500.00,
  NOW() + INTERVAL '21 days',
  NULL
),
(
  (SELECT id FROM clients WHERE name = 'Kofi Boateng'),
  'ORD-2024-003',
  'completed',
  '[
    {"name": "Casual Kaftan", "quantity": 1, "unit_cost": 350.00, "total_cost": 350.00}
  ]'::jsonb,
  350.00,
  350.00,
  NOW() - INTERVAL '7 days',
  'Completed and delivered'
),
(
  (SELECT id FROM clients WHERE name = 'Akua Owusu'),
  'ORD-2024-004',
  'generated',
  '[
    {"name": "Agbada Set", "quantity": 1, "unit_cost": 1200.00, "total_cost": 1200.00},
    {"name": "Cap", "quantity": 1, "unit_cost": 100.00, "total_cost": 100.00}
  ]'::jsonb,
  1300.00,
  650.00,
  NOW() + INTERVAL '30 days',
  'Special occasion - needs premium fabric'
),
(
  (SELECT id FROM clients WHERE name = 'Yaw Appiah'),
  'ORD-2024-005',
  'cancelled',
  '[
    {"name": "Two-Piece Set", "quantity": 3, "unit_cost": 500.00, "total_cost": 1500.00}
  ]'::jsonb,
  1500.00,
  0.00,
  NOW() + INTERVAL '45 days',
  'Customer requested cancellation'
);

-- ============================================================================
-- SAMPLE INVOICES
-- ============================================================================
INSERT INTO public.invoices (order_id, invoice_number, amount, status, due_date, paid_at, notes) VALUES
(
  (SELECT id FROM orders WHERE order_number = 'ORD-2024-001'),
  'INV-2024-001',
  300.00,
  'paid',
  NOW() + INTERVAL '7 days',
  NOW() - INTERVAL '5 days',
  'Deposit payment received'
),
(
  (SELECT id FROM orders WHERE order_number = 'ORD-2024-002'),
  'INV-2024-002',
  510.00,
  'pending',
  NOW() + INTERVAL '14 days',
  NULL,
  'Balance payment pending'
),
(
  (SELECT id FROM orders WHERE order_number = 'ORD-2024-003'),
  'INV-2024-003',
  350.00,
  'paid',
  NOW() - INTERVAL '10 days',
  NOW() - INTERVAL '12 days',
  'Paid in full'
),
(
  (SELECT id FROM orders WHERE order_number = 'ORD-2024-004'),
  'INV-2024-004',
  650.00,
  'sent',
  NOW() + INTERVAL '7 days',
  NULL,
  'Invoice sent via WhatsApp'
);

-- Update completed_at for completed orders
UPDATE orders
SET completed_at = NOW() - INTERVAL '7 days'
WHERE order_number = 'ORD-2024-003';

-- Update cancelled_at for cancelled orders
UPDATE orders
SET cancelled_at = NOW() - INTERVAL '2 days'
WHERE order_number = 'ORD-2024-005';

-- ============================================================================
-- VERIFICATION
-- ============================================================================
SELECT 
  'Sample data inserted successfully!' as status,
  (SELECT COUNT(*) FROM clients) as clients_count,
  (SELECT COUNT(*) FROM orders) as orders_count,
  (SELECT COUNT(*) FROM invoices) as invoices_count,
  (SELECT COUNT(*) FROM measurements) as measurements_count;
