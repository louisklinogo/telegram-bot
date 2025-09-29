"use client";

import { Download, Filter, Plus } from "lucide-react";

import { InvoicesTable } from "@/components/invoices-table";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useInvoices } from "@/hooks/use-supabase-data";

export default function InvoicesPage() {
  const { data: invoices, isLoading } = useInvoices();

  const headerActions = (
    <div className="flex items-center gap-2">
      <Input placeholder="Search invoices..." className="h-9 w-64" />
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filter
      </Button>
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
      <InvoicesTable invoices={invoices || []} isLoading={isLoading} />
    </PageShell>
  );
}
