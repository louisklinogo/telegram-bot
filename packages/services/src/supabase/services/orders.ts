import { getSupabaseServiceClient } from "../../supabaseClient";
import type { OrderItemRecord, OrderRecord } from "../types";

const ORDER_TABLE = "orders";
const ORDER_ITEMS_TABLE = "order_items";

export interface OrderItemInput {
  name: string;
  quantity: number;
  unit_cost: number;
  total_cost: number;
}

export interface CreateOrderInput {
  clientId: string;
  totalPrice: number;
  notes?: string | null;
  invoiceFileUrl?: string | null;
  status?: string;
  items: OrderItemInput[];
}

const ORDER_PREFIX = "ORD-";

const DEFAULT_ORDER_STATUS = "Generated";

async function generateSequentialNumber(
  table: string,
  column: string,
  prefix: string
): Promise<string> {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(table)
    .select(column)
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest number for ${table}: ${error.message}`);
  }

  const lastRow = data as Record<string, string | null> | null;
  const lastNumber = lastRow ? lastRow[column] : undefined;
  if (typeof lastNumber === "string") {
    const match = lastNumber.match(/(\d+)$/);
    if (match) {
      const next = (Number.parseInt(match[1], 10) || 0) + 1;
      return `${prefix}${next.toString().padStart(4, "0")}`;
    }
  }

  return `${prefix}0001`;
}

export async function createOrderWithItems(
  input: CreateOrderInput
): Promise<{ order: OrderRecord; items: OrderItemRecord[] }> {
  const supabase = getSupabaseServiceClient();
  const orderNumber = await generateSequentialNumber(ORDER_TABLE, "order_number", ORDER_PREFIX);

  const { data: orderData, error: orderError } = await supabase
    .from(ORDER_TABLE)
    .insert({
      client_id: input.clientId,
      order_number: orderNumber,
      total_price: input.totalPrice,
      status: input.status || DEFAULT_ORDER_STATUS,
      notes: input.notes || null,
      invoice_file_url: input.invoiceFileUrl || null,
    })
    .select("*")
    .maybeSingle();

  if (orderError) {
    throw new Error(`Failed to create order: ${orderError.message}`);
  }

  if (!orderData) {
    throw new Error("Supabase returned no order data after insert");
  }

  const orderRecord = orderData as OrderRecord;

  if (input.items.length === 0) {
    return { order: orderRecord, items: [] };
  }

  const itemsPayload = input.items.map((item) => ({
    order_id: orderRecord.id,
    name: item.name,
    quantity: item.quantity,
    unit_cost: item.unit_cost,
    total_cost: item.total_cost,
  }));

  const { data: itemData, error: itemError } = await supabase
    .from(ORDER_ITEMS_TABLE)
    .insert(itemsPayload)
    .select("*");

  if (itemError) {
    throw new Error(`Failed to store order items: ${itemError.message}`);
  }

  return {
    order: orderRecord,
    items: (itemData as OrderItemRecord[] | null) ?? [],
  };
}
