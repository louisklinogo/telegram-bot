"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { formatDistanceToNow } from "date-fns";
import { ArrowUpDown, ExternalLink, MoreVertical } from "lucide-react";
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
import type { OrderWithClient } from "@/lib/supabase-queries";
import { formatCurrency } from "@/lib/currency";

export type OrderColumn = OrderWithClient;

const STATUS_VARIANTS: Record<string, "default" | "secondary" | "outline" | "destructive"> = {
  generated: "outline",
  in_progress: "secondary",
  completed: "default",
  cancelled: "destructive",
};

const STATUS_LABELS: Record<string, string> = {
  generated: "Generated",
  in_progress: "In Progress",
  completed: "Completed",
  cancelled: "Cancelled",
};

type BadgeVariant = "default" | "secondary" | "outline" | "destructive";

interface CreateColumnsOptions {
  onEdit?: (order: OrderColumn) => void;
  onDelete?: (order: OrderColumn) => void;
}

export const createColumns = (options?: CreateColumnsOptions): ColumnDef<OrderColumn>[] => [
  {
    accessorKey: "order_number",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Order #
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return <span className="font-mono text-sm">{row.original.order_number}</span>;
    },
  },
  {
    accessorKey: "client",
    header: "Client",
    cell: ({ row }) => {
      const order = row.original;
      return (
        <div>
          <p className="font-medium">{order.client?.name || "Unknown"}</p>
          {order.client?.phone && (
            <p className="text-xs text-muted-foreground">{order.client.phone}</p>
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
    accessorKey: "total_price",
    header: ({ column }) => {
      return (
        <Button
          variant="ghost"
          onClick={() => column.toggleSorting(column.getIsSorted() === "asc")}
          className="-ml-4 h-8"
        >
          Total
          <ArrowUpDown className="ml-2 h-4 w-4" />
        </Button>
      );
    },
    cell: ({ row }) => {
      return (
        <div className="text-right font-medium">{formatCurrency(row.original.total_price)}</div>
      );
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
      const order = row.original;

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
            <DropdownMenuItem>
              <ExternalLink className="mr-2 h-4 w-4" />
              View details
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => options?.onEdit?.(order)}>Edit order</DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onClick={() => options?.onDelete?.(order)}
            >
              Delete order
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
  },
];
