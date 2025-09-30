"use client";

import { Download, Plus } from "lucide-react";

import { InvoicesTable } from "@/components/invoices-table";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useInvoices } from "@/hooks/use-supabase-data";
import { useMarkInvoiceAsPaid } from "@/hooks/use-invoice-mutations";
import type { InvoiceColumn } from "@/app/invoices/columns";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();
  const markAsPaidMutation = useMarkInvoiceAsPaid();

  const handleMarkAsPaid = (invoice: InvoiceColumn) => {
    markAsPaidMutation.mutate(invoice.id);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Button variant="outline" size="sm" className="gap-2">
        <Download className="h-4 w-4" /> Export
      </Button>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> New Invoice
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Invoices"
      description="Track payments across Supabase records and keep cash flow steady."
      headerActions={headerActions}
      className="space-y-6"
    >
      <InvoicesTable 
        invoices={invoices || []} 
        isLoading={isLoading} 
        onMarkAsPaid={handleMarkAsPaid}
      />
    </PageShell>
  );
}
