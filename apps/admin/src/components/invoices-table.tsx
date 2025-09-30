"use client";

import { createColumns } from "@/app/invoices/columns";
import { DataTable } from "@/components/data-table";
import type { InvoiceWithOrder } from "@/lib/supabase-queries";

interface InvoicesTableProps {
  invoices: InvoiceWithOrder[];
  isLoading?: boolean;
}

export function InvoicesTable({ invoices, isLoading }: InvoicesTableProps) {
  const columns = createColumns();

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
