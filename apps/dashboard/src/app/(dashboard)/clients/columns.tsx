"use client";

import type { ClientRecord } from "@Faworra/services";
import type { ColumnDef } from "@tanstack/react-table";

export type ClientColumn = ClientRecord;

export const createColumns = (
  _onEdit?: (client: ClientRecord) => void,
  _onDelete?: (client: ClientRecord) => void
): ColumnDef<ClientRecord>[] => [
  {
    accessorKey: "name",
    header: "Name",
    cell: ({ row }) => <span className="font-medium">{row.original.name}</span>,
  },
  {
    accessorKey: "whatsapp",
    header: "WhatsApp",
  },
  {
    accessorKey: "phone",
    header: "Phone",
  },
  {
    accessorKey: "email",
    header: "Email",
  },
];
