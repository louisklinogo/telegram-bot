-- ============================================================================
-- DROP EXISTING TABLES - Schema V2 Migration
-- ============================================================================
-- WARNING: This will delete ALL existing data!
-- Make sure to backup your data before running this script.
-- ============================================================================

-- Drop tables in correct order (respecting foreign key dependencies)
DROP TABLE IF EXISTS public.measurements CASCADE;
DROP TABLE IF EXISTS public.invoices CASCADE;
DROP TABLE IF EXISTS public.orders CASCADE;
DROP TABLE IF EXISTS public.clients CASCADE;

-- Drop old triggers
DROP TRIGGER IF EXISTS update_clients_updated_at ON public.clients;
DROP TRIGGER IF EXISTS update_orders_updated_at ON public.orders;
DROP TRIGGER IF EXISTS update_invoices_updated_at ON public.invoices;
DROP TRIGGER IF EXISTS update_measurements_updated_at ON public.measurements;

-- Drop old functions
DROP FUNCTION IF EXISTS update_updated_at_column();

-- Confirmation message
SELECT 'All tables dropped successfully. Ready for Schema V2.' AS status;
