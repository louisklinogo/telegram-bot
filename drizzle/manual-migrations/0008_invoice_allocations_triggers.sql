-- Trigger function to recalc invoice payments on allocation changes
CREATE OR REPLACE FUNCTION public.tg_recalc_invoice_payments()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    PERFORM public.recalc_invoice_payments(NEW.invoice_id);
  ELSIF TG_OP = 'UPDATE' THEN
    -- If invoice_id changed, recalc both old and new
    IF NEW.invoice_id IS DISTINCT FROM OLD.invoice_id THEN
      PERFORM public.recalc_invoice_payments(OLD.invoice_id);
    END IF;
    PERFORM public.recalc_invoice_payments(NEW.invoice_id);
  ELSIF TG_OP = 'DELETE' THEN
    PERFORM public.recalc_invoice_payments(OLD.invoice_id);
  END IF;
  RETURN NULL;
END;
$$;

-- Create triggers (idempotent)
DROP TRIGGER IF EXISTS tr_alloc_after_insert ON public.transaction_allocations;
CREATE TRIGGER tr_alloc_after_insert
AFTER INSERT ON public.transaction_allocations
FOR EACH ROW EXECUTE FUNCTION public.tg_recalc_invoice_payments();

DROP TRIGGER IF EXISTS tr_alloc_after_update ON public.transaction_allocations;
CREATE TRIGGER tr_alloc_after_update
AFTER UPDATE ON public.transaction_allocations
FOR EACH ROW EXECUTE FUNCTION public.tg_recalc_invoice_payments();

DROP TRIGGER IF EXISTS tr_alloc_after_delete ON public.transaction_allocations;
CREATE TRIGGER tr_alloc_after_delete
AFTER DELETE ON public.transaction_allocations
FOR EACH ROW EXECUTE FUNCTION public.tg_recalc_invoice_payments();
