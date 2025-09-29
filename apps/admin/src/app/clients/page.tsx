"use client";

import { useState } from "react";
import { Filter, Plus } from "lucide-react";

import { ClientsTable } from "@/components/clients-table";
import { ClientSheet } from "@/components/client-sheet";
import { DeleteClientDialog } from "@/components/delete-client-dialog";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useClients } from "@/hooks/use-supabase-data";

export default function ClientsPage() {
  const { data: clients, isLoading } = useClients();
  const [sheetOpen, setSheetOpen] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [selectedClient, setSelectedClient] = useState<any>(null);

  const handleEdit = (client: any) => {
    setSelectedClient(client);
    setSheetOpen(true);
  };

  const handleDelete = (client: any) => {
    setSelectedClient(client);
    setDeleteDialogOpen(true);
  };

  const handleCreate = () => {
    setSelectedClient(null);
    setSheetOpen(true);
  };

  const headerActions = (
    <div className="flex items-center gap-2">
      <Input placeholder="Search clients..." className="h-9 w-64" />
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filter
      </Button>
      <Button size="sm" className="gap-2" onClick={handleCreate}>
        <Plus className="h-4 w-4" /> Add Client
      </Button>
    </div>
  );

  return (
    <>
      <PageShell
        title="Clients"
        description="Maintain customer relationships and quickly review order history."
        headerActions={headerActions}
        className="space-y-6"
      >
        <ClientsTable 
          clients={clients || []} 
          isLoading={isLoading}
          onEdit={handleEdit}
          onDelete={handleDelete}
        />
      </PageShell>

      <ClientSheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        client={selectedClient}
      />

      <DeleteClientDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        client={selectedClient}
      />
    </>
  );
}
