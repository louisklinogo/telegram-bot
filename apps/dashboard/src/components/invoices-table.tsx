"use client";

import { createColumns, type InvoiceColumn } from "@/app/(dashboard)/invoices/columns";
import { DataTable } from "@/components/data-table";
import type { InvoiceWithOrder } from "@/lib/supabase-queries";

interface InvoicesTableProps {
  invoices: InvoiceWithOrder[];
  isLoading?: boolean;
  onMarkAsPaid?: (invoice: InvoiceColumn) => void;
}

export function InvoicesTable({ invoices, isLoading, onMarkAsPaid }: InvoicesTableProps) {
  const columns = createColumns({ onMarkAsPaid });

  return (
    <DataTable
      columns={columns}
      data={invoices}
      isLoading={isLoading}
      searchKey="invoice_number"
      searchPlaceholder="Search invoices by number..."
    />
  );
}
