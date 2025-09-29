"use client";

import { formatDistanceToNow } from "date-fns";
import { Mail, MoreVertical, Phone } from "lucide-react";

import type { ClientRecord } from "@cimantikos/services";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

interface ClientsTableProps {
  clients: ClientRecord[];
  isLoading?: boolean;
  onEdit?: (client: ClientRecord) => void;
  onDelete?: (client: ClientRecord) => void;
}

export function ClientsTable({ clients, isLoading, onEdit, onDelete }: ClientsTableProps) {
  if (isLoading) {
    return (
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, i) => (
          <div key={`skeleton-${i}`} className="flex items-center gap-4 rounded-lg border p-4">
            <Skeleton className="h-5 w-48" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-32" />
            <Skeleton className="h-5 w-24" />
          </div>
        ))}
      </div>
    );
  }

  if (!clients?.length) {
    return (
      <div className="flex min-h-[400px] flex-col items-center justify-center rounded-lg border border-dashed p-8 text-center">
        <p className="text-sm text-muted-foreground">No clients found</p>
      </div>
    );
  }

  return (
    <div className="rounded-lg border">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Name</TableHead>
            <TableHead>Contact</TableHead>
            <TableHead>Referral Source</TableHead>
            <TableHead className="w-32">Joined</TableHead>
            <TableHead className="w-16" />
          </TableRow>
        </TableHeader>
        <TableBody>
          {clients.map((client) => (
            <TableRow key={client.id}>
              <TableCell>
                <div>
                  <p className="font-medium">{client.name}</p>
                  {client.address && (
                    <p className="text-xs text-muted-foreground">{client.address}</p>
                  )}
                </div>
              </TableCell>
              <TableCell>
                <div className="space-y-1 text-sm">
                  {client.phone && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Phone className="h-3 w-3" />
                      {client.phone}
                    </div>
                  )}
                  {client.email && (
                    <div className="flex items-center gap-1.5 text-muted-foreground">
                      <Mail className="h-3 w-3" />
                      {client.email}
                    </div>
                  )}
                </div>
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {client.referral_source || "—"}
              </TableCell>
              <TableCell className="text-sm text-muted-foreground">
                {formatDistanceToNow(new Date(client.created_at), { addSuffix: true })}
              </TableCell>
              <TableCell>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                      <MoreVertical className="h-4 w-4" />
                      <span className="sr-only">Open menu</span>
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end">
                    <DropdownMenuLabel>Actions</DropdownMenuLabel>
                    <DropdownMenuItem>View profile</DropdownMenuItem>
                    <DropdownMenuItem>View orders</DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem onClick={() => onEdit?.(client)}>
                      Edit client
                    </DropdownMenuItem>
                    <DropdownMenuItem
                      className="text-destructive"
                      onClick={() => onDelete?.(client)}
                    >
                      Delete client
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  );
}
