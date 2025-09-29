"use client";

import { Filter, Plus } from "lucide-react";

import { ClientsTable } from "@/components/clients-table";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/use-supabase-data";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();

  const headerActions = (
    <div className="flex items-center gap-2">
      <Input placeholder="Search clients..." className="h-9 w-64" />
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filter
      </Button>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> Add Client
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Clients"
      description="Maintain customer relationships and quickly review order history."
      headerActions={headerActions}
      className="space-y-6"
    >
      <ClientsTable clients={clients || []} isLoading={isLoading} />
    </PageShell>
  );
}
