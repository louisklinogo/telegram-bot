/** Legacy transactions module now only exports types used by UI. */

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

export interface TransactionStats {
  totalIncome: number;
  totalExpenses: number;
  netProfit: number;
  pendingPayments: number;
  completedTransactions: number;
}
