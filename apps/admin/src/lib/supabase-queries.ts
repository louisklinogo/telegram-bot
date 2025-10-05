// Legacy supabase-queries module now only exports types.
// All data fetching/mutations must go through tRPC or Server Components.

import type {
  ClientRecord,
  InvoiceRecord,
  MeasurementRecord,
  OrderRecord,
} from "@cimantikos/services";

export interface OrderWithClient extends OrderRecord {
  client?: ClientRecord;
  items?: unknown[];
}

export interface InvoiceWithOrder extends InvoiceRecord {
  order?: OrderWithClient;
}

export interface MeasurementWithClient extends MeasurementRecord {
  client?: ClientRecord;
}

export interface DashboardStats {
  activeOrders: number;
  outstandingInvoicesAmount: number;
  outstandingInvoicesCount: number;
  recentMeasurements: number;
  recentFiles: number;
}
