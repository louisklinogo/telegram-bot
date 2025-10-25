import { getSupabaseServiceClient } from "../../supabaseClient";
import type { InvoiceRecord } from "../types";

const INVOICE_TABLE = "invoices";
const INVOICE_PREFIX = "INV-";
const DEFAULT_INVOICE_STATUS = "Generated";

const generateSequentialNumber = async (): Promise<string> => {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .select("invoice_number")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch latest invoice number: ${error.message}`);
  }

  const lastNumber = data?.invoice_number;
  if (typeof lastNumber === "string") {
    const match = lastNumber.match(/(\d+)$/);
    if (match) {
      const next = (Number.parseInt(match[1], 10) || 0) + 1;
      return `${INVOICE_PREFIX}${next.toString().padStart(4, "0")}`;
    }
  }

  return `${INVOICE_PREFIX}0001`;
};

export interface CreateInvoiceInput {
  orderId: string;
  amount: number;
  pdfUrl?: string | null;
  dueAt?: string | null;
  status?: string;
}

export const createInvoiceRecord = async (input: CreateInvoiceInput): Promise<InvoiceRecord> => {
  const supabase = getSupabaseServiceClient();
  const invoiceNumber = await generateSequentialNumber();

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .insert({
      order_id: input.orderId,
      invoice_number: invoiceNumber,
      amount: input.amount,
      status: input.status || DEFAULT_INVOICE_STATUS,
      pdf_url: input.pdfUrl || null,
      issued_at: new Date().toISOString(),
      due_at: input.dueAt || null,
    })
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to create invoice: ${error.message}`);
  }

  if (!data) {
    throw new Error("Supabase returned no invoice data after insert");
  }

  return data as InvoiceRecord;
};

export const updateInvoiceStatus = async (
  invoiceId: string,
  status: string,
  paidAt?: string | null
): Promise<InvoiceRecord> => {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .update({
      status,
      paid_at: paidAt ?? null,
    })
    .eq("id", invoiceId)
    .select("*")
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to update invoice status: ${error.message}`);
  }

  if (!data) {
    throw new Error("Supabase returned no invoice data after update");
  }

  return data as InvoiceRecord;
};

export const getInvoiceById = async (invoiceId: string): Promise<InvoiceRecord | null> => {
  const supabase = getSupabaseServiceClient();

  const { data, error } = await supabase
    .from(INVOICE_TABLE)
    .select("*")
    .eq("id", invoiceId)
    .maybeSingle();

  if (error) {
    throw new Error(`Failed to fetch invoice: ${error.message}`);
  }

  return (data as InvoiceRecord | null) ?? null;
};
