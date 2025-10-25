-- Migration: Fix recalc_order_totals() to remove reference to orders.items
-- Safe to run multiple times
CREATE OR REPLACE FUNCTION public.recalc_order_totals(p_order_id uuid)
RETURNS void
LANGUAGE plpgsql
AS $$
DECLARE
  v_sum numeric(10,2);
BEGIN
  SELECT COALESCE(SUM(oi.total), 0)::numeric(10,2)
    INTO v_sum
  FROM public.order_items oi
  WHERE oi.order_id = p_order_id;

  UPDATE public.orders o
  SET total_price   = v_sum,
      balance_amount = GREATEST(0, COALESCE(v_sum,0) - COALESCE(o.deposit_amount,0)),
      updated_at     = now()
  WHERE o.id = p_order_id;
END;
$$;