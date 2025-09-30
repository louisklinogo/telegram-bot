/**
 * React Query hooks for Supabase data fetching
 */

import { useQuery } from "@tanstack/react-query";

import {
  fetchClientById,
  fetchClients,
  fetchDashboardStats,
  fetchFiles,
  fetchInvoices,
  fetchMeasurements,
  fetchOrderById,
  fetchOrders,
} from "@/lib/supabase-queries";
import {
  fetchTransactions,
  fetchTransactionStats,
} from "@/lib/supabase-transactions";

export const queryKeys = {
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  invoices: ["invoices"] as const,
  measurements: ["measurements"] as const,
  files: ["files"] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  transactions: ["transactions"] as const,
  transactionStats: ["transactions", "stats"] as const,
};

export function useClients() {
  return useQuery({
    queryKey: queryKeys.clients,
    queryFn: fetchClients,
  });
}

export function useClient(id: string) {
  return useQuery({
    queryKey: queryKeys.client(id),
    queryFn: () => fetchClientById(id),
    enabled: !!id,
  });
}

export function useOrders() {
  return useQuery({
    queryKey: queryKeys.orders,
    queryFn: fetchOrders,
  });
}

export function useOrder(id: string) {
  return useQuery({
    queryKey: queryKeys.order(id),
    queryFn: () => fetchOrderById(id),
    enabled: !!id,
  });
}

export function useInvoices() {
  return useQuery({
    queryKey: queryKeys.invoices,
    queryFn: fetchInvoices,
  });
}

export function useMeasurements() {
  return useQuery({
    queryKey: queryKeys.measurements,
    queryFn: fetchMeasurements,
  });
}

export function useFiles() {
  return useQuery({
    queryKey: queryKeys.files,
    queryFn: fetchFiles,
  });
}

export function useDashboardStats() {
  return useQuery({
    queryKey: queryKeys.dashboardStats,
    queryFn: fetchDashboardStats,
    refetchInterval: 30000, // 30 seconds
  });
}

export function useTransactions() {
  return useQuery({
    queryKey: queryKeys.transactions,
    queryFn: fetchTransactions,
  });
}

export function useTransactionStats() {
  return useQuery({
    queryKey: queryKeys.transactionStats,
    queryFn: fetchTransactionStats,
    refetchInterval: 30000, // 30 seconds
  });
}
