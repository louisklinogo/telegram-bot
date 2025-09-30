"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, Download, ExternalLink, MoreVertical } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import type { InvoiceWithOrder } from "@/lib/supabase-queries";
import { formatCurrency } from "@/lib/currency";

export type InvoiceColumn = InvoiceWithOrder;

interface CreateColumnsOptions {
  onMarkAsPaid?: (invoice: InvoiceColumn) => void;
}

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  draft: "outline",
  pending: "secondary",
  sent: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "outline",
};

const STATUS_LABELS: Record<string, string> = {
  draft: "Draft",
  pending: "Pending",
  sent: "Sent",
  paid: "Paid",
  overdue: "Overdue",
  cancelled: "Cancelled",
};

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

export const createColumns = (options?: CreateColumnsOptions): ColumnDef<InvoiceColumn>[] => [
  {
    accessorKey: "invoice_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Invoice #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="font-mono text-sm">{row.original.invoice_number}</span>;
    },
  },
  {
    accessorKey: "order",
    header: "Order / Client",
    cell: ({ row }) => {
      const invoice = row.original;
      return (
        <div>
          <p className="font-medium">{invoice.order?.order_number || "Unknown Order"}</p>
          {invoice.order?.client && (
            <p className="text-xs text-muted-foreground">{invoice.order.client.name}</p>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "status",
    header: "Status",
    cell: ({ row }) => {
      const status = row.original.status;
      const variant = (STATUS_VARIANTS[status] || "outline") as BadgeVariant;
      const label = STATUS_LABELS[status] || status;
      return <Badge variant={variant}>{label}</Badge>;
    },
  },
  {
    accessorKey: "amount",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Amount
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="font-medium">{formatCurrency(row.original.amount)}</span>;
    },
  },
  {
    accessorKey: "created_at",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Created
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <span className="text-sm text-muted-foreground">
          {formatDistanceToNow(new Date(row.original.created_at), {
            addSuffix: true,
          })}
        </span>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row }) => {
      const invoice = row.original;

      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
              <MoreVertical className="h-4 w-4" />
              <span className="sr-only">Open menu</span>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuLabel>Actions</DropdownMenuLabel>
            {invoice.status !== "paid" && (
              <>
                <DropdownMenuItem onClick={() => options?.onMarkAsPaid?.(invoice)}>
                  Mark as Paid
                </DropdownMenuItem>
                <DropdownMenuSeparator />
              </>
            )}
            <DropdownMenuItem disabled={!invoice.invoice_url}>
              <Download className="mr-2 h-4 w-4" />
              Download PDF
            </DropdownMenuItem>
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />
              View order
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem>Send reminder</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive">Cancel invoice</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
