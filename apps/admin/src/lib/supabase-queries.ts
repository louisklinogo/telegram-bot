/**
 * Browser-safe Supabase query functions for admin dashboard
 * Uses anon key + RLS policies (when implemented)
 */

import type {
  ClientRecord,
  FileRecord,
  InvoiceRecord,
  MeasurementRecord,
  OrderRecord,
} from "@cimantikos/services";
import { supabaseBrowser } from "./supabase-browser";

function ensureSupabase() {
  if (!supabaseBrowser) {
    throw new Error(
      "Supabase client not initialized. Check NEXT_PUBLIC_SUPABASE_URL and NEXT_PUBLIC_SUPABASE_ANON_KEY",
    );
  }
  return supabaseBrowser;
}

// ============================================================================
// CLIENTS
// ============================================================================

export async function fetchClients(): Promise<ClientRecord[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("clients")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch clients: ${error.message}`);
  return data as ClientRecord[];
}

export async function fetchClientById(id: string): Promise<ClientRecord | null> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase.from("clients").select("*").eq("id", id).maybeSingle();

  if (error) throw new Error(`Failed to fetch client: ${error.message}`);
  return data as ClientRecord | null;
}

// ============================================================================
// ORDERS
// ============================================================================

export interface OrderWithClient extends OrderRecord {
  client?: ClientRecord;
  items?: unknown[];
}

export async function fetchOrders(): Promise<OrderWithClient[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:clients(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch orders: ${error.message}`);
  return data as OrderWithClient[];
}

export async function fetchOrderById(id: string): Promise<OrderWithClient | null> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("orders")
    .select(`
      *,
      client:clients(*),
      items:order_items(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch order: ${error.message}`);
  return data as OrderWithClient | null;
}

// ============================================================================
// INVOICES
// ============================================================================

export interface InvoiceWithOrder extends InvoiceRecord {
  order?: OrderWithClient;
}

export async function fetchInvoices(): Promise<InvoiceWithOrder[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("invoices")
    .select(`
      *,
      order:orders(
        *,
        client:clients(*)
      )
    `)
    .order("issued_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch invoices: ${error.message}`);
  return data as InvoiceWithOrder[];
}

// ============================================================================
// MEASUREMENTS
// ============================================================================

export interface MeasurementWithClient extends MeasurementRecord {
  client?: ClientRecord;
}

export async function fetchMeasurements(): Promise<MeasurementWithClient[]> {
  const supabase = ensureSupabase();
  const { data, error} = await supabase
    .from("measurements")
    .select(`
      *,
      client:clients(*)
    `)
    .order("created_at", { ascending: false });

  if (error) throw new Error(`Failed to fetch measurements: ${error.message}`);
  return data as MeasurementWithClient[];
}

// ============================================================================
// FILES
// ============================================================================

export async function fetchFiles(): Promise<FileRecord[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("files")
    .select("*")
    .order("created_at", { ascending: false })
    .limit(100);

  if (error) throw new Error(`Failed to fetch files: ${error.message}`);
  return data as FileRecord[];
}

// ============================================================================
// DASHBOARD STATS
// ============================================================================

export interface DashboardStats {
  activeOrders: number;
  outstandingInvoicesAmount: number;
  outstandingInvoicesCount: number;
  recentMeasurements: number;
  recentFiles: number;
}

export async function fetchDashboardStats(): Promise<DashboardStats> {
  const supabase = ensureSupabase();

  const [ordersRes, invoicesRes, measurementsRes, filesRes] = await Promise.all([
    supabase.from("orders").select("id", { count: "exact", head: true }).neq("status", "Completed"),
    supabase
      .from("invoices")
      .select("amount", { count: "exact" })
      .in("status", ["pending", "sent", "overdue"]),
    supabase
      .from("measurements")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
    supabase
      .from("files")
      .select("id", { count: "exact", head: true })
      .gte("created_at", new Date(Date.now() - 7 * 24 * 60 * 60 * 1000).toISOString()),
  ]);

  if (ordersRes.error) throw new Error(`Stats fetch failed: ${ordersRes.error.message}`);
  if (invoicesRes.error) throw new Error(`Stats fetch failed: ${invoicesRes.error.message}`);
  if (measurementsRes.error)
    throw new Error(`Stats fetch failed: ${measurementsRes.error.message}`);
  if (filesRes.error) throw new Error(`Stats fetch failed: ${filesRes.error.message}`);

  const outstandingAmount = (invoicesRes.data || []).reduce(
    (sum, inv) => sum + (inv.amount || 0),
    0,
  );

  return {
    activeOrders: ordersRes.count || 0,
    outstandingInvoicesAmount: outstandingAmount,
    outstandingInvoicesCount: invoicesRes.count || 0,
    recentMeasurements: measurementsRes.count || 0,
    recentFiles: filesRes.count || 0,
  };
}
