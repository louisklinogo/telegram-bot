"use client";

import { type ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { MoreHorizontal } from "lucide-react";
import { format } from "date-fns";

export type TransactionRow = {
  transaction: {
    id: string;
    date: string | Date;
    description: string;
    paymentReference?: string | null;
    type: "payment" | "expense" | "refund" | "adjustment";
    status: "pending" | "completed" | "failed" | "cancelled";
    amount: number;
    currency: string;
    categorySlug?: string | null;
    paymentMethod?: string | null;
    excludeFromAnalytics?: boolean | null;
  };
  client?: { id: string; name: string } | null;
  category?: { id: string; name: string; slug: string; color?: string | null } | null;
};

type TableMeta = {
  isSelected?: (id: string) => boolean;
  toggleSelectedId?: (id: string) => void;
  toggleAllOnPage?: (checked: boolean, ids: string[]) => void;
  onViewDetails?: (row: TransactionRow) => void;
  onToggleStatus?: (id: string, status: TransactionRow["transaction"]["status"]) => Promise<void> | void;
  onToggleExclude?: (id: string, exclude: boolean) => Promise<void> | void;
  onDelete?: (id: string) => Promise<void> | void;
};

export const columns: ColumnDef<TransactionRow, any>[] = [
  {
    id: "select",
    header: ({ table }) => {
      const meta = table.options.meta as TableMeta | undefined;
      const rows = table.getRowModel().rows;
      const ids = rows.map((r) => (r.original as TransactionRow).transaction.id);
      const selectedCount = ids.filter((id) => meta?.isSelected?.(id)).length;
      const all = ids.length > 0 && selectedCount === ids.length;
      const some = selectedCount > 0 && !all;
      return (
        <Checkbox
          checked={all || (some && "indeterminate") || false}
          onCheckedChange={(v) => {
            if (meta?.toggleAllOnPage) {
              meta.toggleAllOnPage(v === true, ids);
            }
          }}
          aria-label="Select all"
        />
      );
    },
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta | undefined;
      const id = (row.original as TransactionRow).transaction.id;
      const checked = !!meta?.isSelected?.(id);
      return (
        <Checkbox
          checked={checked}
          onCheckedChange={() => meta?.toggleSelectedId?.(id)}
          aria-label="Select row"
        />
      );
    },
    enableSorting: false,
    enableHiding: false,
  },
  {
    id: "date",
    accessorFn: (row) => row.transaction.date,
    header: "Date",
    cell: ({ row }) => {
      const date = (row.original as TransactionRow).transaction.date;
      return format(new Date(date), "MMM d, yyyy");
    },
  },
  {
    id: "description",
    accessorFn: (row) => row.transaction.description,
    header: "Description",
    cell: ({ row }) => {
      const { description, paymentReference } = (row.original as TransactionRow).transaction;
      return (
        <div className="flex flex-col">
          <span className="font-medium">{description}</span>
          {paymentReference && (
            <span className="text-xs text-muted-foreground">{paymentReference}</span>
          )}
        </div>
      );
    },
  },
  {
    id: "client",
    accessorFn: (row) => row.client?.name,
    header: "Client",
    cell: ({ row }) => {
      const client = (row.original as TransactionRow).client;
      return client ? <span>{client.name}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: "type",
    accessorFn: (row) => row.transaction.type,
    header: "Type",
    cell: ({ row }) => {
      const type = (row.original as TransactionRow).transaction.type;
      const variants: Record<string, string> = {
        payment: "default",
        expense: "destructive",
        refund: "secondary",
        adjustment: "outline",
      };
      return <Badge variant={variants[type] as any}>{type}</Badge>;
    },
  },
  {
    id: "category",
    accessorFn: (row) => row.category?.name,
    header: "Category",
    cell: ({ row }) => {
      const category = (row.original as TransactionRow).category;
      return category ? (
        <div className="flex items-center gap-2">
          {category.color && (
            <div className="h-3 w-3 rounded-full" style={{ backgroundColor: category.color }} />
          )}
          <span>{category.name}</span>
        </div>
      ) : (
        <span className="text-muted-foreground">Uncategorized</span>
      );
    },
  },
  {
    id: "method",
    accessorFn: (row) => row.transaction.paymentMethod,
    header: "Method",
    cell: ({ row }) => {
      const method = (row.original as TransactionRow).transaction.paymentMethod;
      return method ? <span className="capitalize">{method}</span> : <span className="text-muted-foreground">—</span>;
    },
  },
  {
    id: "status",
    accessorFn: (row) => row.transaction.status,
    header: "Status",
    cell: ({ row }) => {
      const status = (row.original as TransactionRow).transaction.status;
      const variants: Record<string, string> = {
        pending: "secondary",
        completed: "default",
        failed: "destructive",
        cancelled: "outline",
      };
      return <Badge variant={variants[status] as any}>{status}</Badge>;
    },
  },
  {
    id: "amount",
    accessorFn: (row) => row.transaction.amount,
    header: () => <div className="text-right">Amount</div>,
    cell: ({ row }) => {
      const { amount, currency } = (row.original as TransactionRow).transaction;
      const formatted = new Intl.NumberFormat("en-US", {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }).format(amount);
      return (
        <div className="text-right font-medium">
          {currency} {formatted}
        </div>
      );
    },
  },
  {
    id: "actions",
    cell: ({ row, table }) => {
      const meta = table.options.meta as TableMeta | undefined;
      const transaction = (row.original as TransactionRow).transaction;
      return (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" className="h-8 w-8 p-0">
              <span className="sr-only">Open menu</span>
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onClick={() => meta?.onViewDetails?.(row.original as TransactionRow)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() =>
                meta?.onToggleStatus?.(
                  transaction.id,
                  transaction.status === "completed" ? "pending" : "completed"
                )
              }
            >
              Mark {transaction.status === "completed" ? "uncompleted" : "completed"}
            </DropdownMenuItem>
            <DropdownMenuItem
              onClick={() => meta?.onToggleExclude?.(transaction.id, !transaction.excludeFromAnalytics)}
            >
              {transaction.excludeFromAnalytics ? "Include" : "Exclude"} from analytics
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem
              onClick={() => meta?.onDelete?.(transaction.id)}
              className="text-destructive focus:text-destructive"
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      );
    },
    enableHiding: false,
  },
];
