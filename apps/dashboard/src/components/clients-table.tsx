"use client";

import type { ClientRecord } from "@Faworra/services";
import { createColumns } from "@/app/(dashboard)/clients/columns";
import { DataTable } from "@/components/data-table";

interface ClientsTableProps {
  clients: ClientRecord[];
  isLoading?: boolean;
  onEdit: (client: ClientRecord) => void;
  onDelete: (client: ClientRecord) => void;
}

export function ClientsTable({ clients, isLoading, onEdit, onDelete }: ClientsTableProps) {
  const columns = createColumns(onEdit, onDelete);

  return (
    <DataTable
      columns={columns}
      data={clients}
      isLoading={isLoading}
      searchKey="name"
      searchPlaceholder="Search clients by name..."
    />
  );
}
