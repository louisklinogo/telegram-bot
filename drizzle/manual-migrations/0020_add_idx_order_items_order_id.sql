-- Migration: Add index for order_items(order_id)
CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items(order_id);