/**
 * Supabase queries for transactions
 */

import { supabaseBrowser } from "./supabase-browser";
import type { ClientRecord } from "@cimantikos/services";

export interface TransactionRecord {
  id: string;
  order_id?: string;
  invoice_id?: string;
  client_id?: string;
  transaction_number: string;
  type: "payment" | "expense" | "refund" | "adjustment";
  category?: string;
  amount: number;
  currency: string;
  payment_method?: string;
  payment_reference?: string;
  description: string;
  notes?: string;
  transaction_date: string;
  due_date?: string;
  status: "pending" | "completed" | "failed" | "cancelled";
  created_at: string;
  updated_at: string;
  deleted_at?: string;
}

export interface TransactionWithClient extends TransactionRecord {
  client?: ClientRecord;
}

function ensureSupabase() {
  if (!supabaseBrowser) {
    throw new Error("Supabase client not initialized");
  }
  return supabaseBrowser;
}

// ============================================================================
// QUERIES
// ============================================================================

export async function fetchTransactions(): Promise<TransactionWithClient[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      client:clients(*)
    `)
    .order("transaction_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
  return data as TransactionWithClient[];
}

export async function fetchTransactionById(id: string): Promise<TransactionWithClient | null> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("id", id)
    .maybeSingle();

  if (error) throw new Error(`Failed to fetch transaction: ${error.message}`);
  return data as TransactionWithClient | null;
}

export async function fetchTransactionsByType(
  type: TransactionRecord["type"]
): Promise<TransactionWithClient[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      client:clients(*)
    `)
    .eq("type", type)
    .order("transaction_date", { ascending: false });

  if (error) throw new Error(`Failed to fetch transactions: ${error.message}`);
  return data as TransactionWithClient[];
}

export async function fetchRecentTransactions(limit = 10): Promise<TransactionWithClient[]> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .select(`
      *,
      client:clients(*)
    `)
    .order("transaction_date", { ascending: false })
    .limit(limit);

  if (error) throw new Error(`Failed to fetch recent transactions: ${error.message}`);
  return data as TransactionWithClient[];
}

// ============================================================================
// MUTATIONS
// ============================================================================

export async function createTransaction(
  transaction: Omit<TransactionRecord, "id" | "created_at" | "updated_at">
): Promise<TransactionRecord> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .insert(transaction)
    .select()
    .single();

  if (error) throw new Error(`Failed to create transaction: ${error.message}`);
  return data as TransactionRecord;
}

export async function updateTransaction(
  id: string,
  updates: Partial<TransactionRecord>
): Promise<TransactionRecord> {
  const supabase = ensureSupabase();
  const { data, error } = await supabase
    .from("transactions")
    .update(updates)
    .eq("id", id)
    .select()
    .single();

  if (error) throw new Error(`Failed to update transaction: ${error.message}`);
  return data as TransactionRecord;
}

export async function deleteTransaction(id: string): Promise<void> {
  const supabase = ensureSupabase();
  const { error } = await supabase.from("transactions").delete().eq("id", id);

  if (error) throw new Error(`Failed to delete transaction: ${error.message}`);
}

// ============================================================================
// STATISTICS
// ============================================================================

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  completedTransactions: number;
}

export async function fetchTransactionStats(): Promise<TransactionStats> {
  const supabase = ensureSupabase();

  const [incomeRes, expensesRes, pendingRes, completedRes] = await Promise.all([
    supabase
      .from("transactions")
      .select("amount")
      .eq("type", "payment")
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("type", "expense")
      .eq("status", "completed"),
    supabase
      .from("transactions")
      .select("amount")
      .eq("type", "payment")
      .eq("status", "pending"),
    supabase
      .from("transactions")
      .select("id", { count: "exact", head: true })
      .eq("status", "completed"),
  ]);

  if (incomeRes.error) throw new Error(`Stats fetch failed: ${incomeRes.error.message}`);
  if (expensesRes.error) throw new Error(`Stats fetch failed: ${expensesRes.error.message}`);
  if (pendingRes.error) throw new Error(`Stats fetch failed: ${pendingRes.error.message}`);
  if (completedRes.error) throw new Error(`Stats fetch failed: ${completedRes.error.message}`);

  const totalIncome = (incomeRes.data || []).reduce((sum, t) => sum + t.amount, 0);
  const totalExpenses = (expensesRes.data || []).reduce((sum, t) => sum + t.amount, 0);
  const pendingPayments = (pendingRes.data || []).reduce((sum, t) => sum + t.amount, 0);

  return {
    totalIncome,
    totalExpenses,
    netProfit: totalIncome - totalExpenses,
    pendingPayments,
    completedTransactions: completedRes.count || 0,
  };
}
