/**
 * React Query hooks for Supabase data fetching
 */

import { trpc } from "@/lib/trpc/client";

export const queryKeys = {
  clients: ["clients"] as const,
  client: (id: string) => ["clients", id] as const,
  orders: ["orders"] as const,
  order: (id: string) => ["orders", id] as const,
  invoices: ["invoices"] as const,
  measurements: ["measurements"] as const,
  dashboardStats: ["dashboard", "stats"] as const,
  transactions: ["transactions"] as const,
  transactionStats: ["transactions", "stats"] as const,
};

export function useClients() {
  const query = trpc.clients.list.useQuery({});

  // Transform new API shape { items, nextCursor } to just items array
  return {
    ...query,
    data: query.data ? (Array.isArray(query.data) ? query.data : query.data.items) : undefined,
  };
}

export function useClient(id: string) {
  return trpc.clients.byId.useQuery({ id }, { enabled: !!id });
}

export function useOrders() {
  return trpc.orders.list.useQuery({ limit: 50 });
}

export function useOrder(id: string) {
  return trpc.orders.byId.useQuery({ id }, { enabled: !!id });
}

export function useInvoices() {
  return trpc.invoices.list.useQuery({ limit: 50 });
}

export function useMeasurements() {
  return trpc.measurements.list.useQuery({ limit: 50 });
}

export function useDashboardStats() {
  return trpc.transactions.stats.useQuery(undefined, { refetchInterval: 30000 });
}

export function useTransactions() {
  return trpc.transactions.list.useQuery({ limit: 50 });
}

export function useTransactionStats() {
  return trpc.transactions.stats.useQuery(undefined, { refetchInterval: 30000 });
}
