"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { formatAmount } from "@/lib/format-currency";

export type TransactionRow = {
  transaction: {
    id: string;
    date: string | Date;
    description: string;
    paymentReference?: string | null;
    type: "payment" | "expense" | "refund" | "adjustment";
    status: "pending" | "completed" | "failed" | "cancelled";
    amount: number;
    categorySlug?: string | null;
    paymentMethod?: string | null;
    excludeFromAnalytics?: boolean | null;
    enrichmentCompleted?: boolean | null;
  };
  client?: {
    id: string;
    name: string;
  } | null;
  category?: {
    id: string;
    name: string;
    slug: string;
  } | null;
  assignedUser?: {
    id: string;
    fullName?: string | null;
    email?: string | null;
  } | null;
  tags?: Array<{ id: string; name: string; color: string | null }>;
};

type ColumnContext = {
  currencyCode: string;
  onToggleSelection: (id: string) => void;
  onViewDetails: (row: TransactionRow) => void;
  onCopyUrl: (id: string) => void;
  onToggleStatus: (id: string, status: string) => void;
  onToggleExclude: (id: string, exclude: boolean) => void;
  onDelete: (id: string) => void;
};

export function createTransactionColumns(context: ColumnContext): ColumnDef<TransactionRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
          aria-label="Select all"
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
          aria-label="Select row"
        />
      ),
      enableSorting: false,
      enableHiding: false,
    },
    {
      accessorKey: "transaction.date",
      id: "date",
      header: "Date",
      cell: ({ row }) => {
        const date = new Date(row.original.transaction.date);
        return (
          <span className="font-medium">
            {date.toLocaleDateString("en-US", {
              month: "short",
              day: "numeric",
              year: "numeric",
            })}
          </span>
        );
      },
      enableHiding: false,
    },
    {
      accessorKey: "transaction.description",
      id: "description",
      header: "Description",
      cell: ({ row }) => (
        <div className="space-y-1">
          <p className="text-sm font-medium">{row.original.transaction.description}</p>
          {row.original.transaction.paymentReference && (
            <p className="text-xs text-muted-foreground">
              Ref: {row.original.transaction.paymentReference}
            </p>
          )}
        </div>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "client.name",
      id: "client",
      header: "Client",
      cell: ({ row }) => row.original.client?.name || "-",
    },
    {
      accessorKey: "transaction.type",
      id: "type",
      header: "Type",
      cell: ({ row }) => (
        <Badge
          variant={
            row.original.transaction.type === "payment"
              ? "default"
              : row.original.transaction.type === "expense"
                ? "secondary"
                : "outline"
          }
        >
          {row.original.transaction.type}
        </Badge>
      ),
      enableHiding: false,
    },
    {
      accessorKey: "category.name",
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.category?.name || row.original.transaction.categorySlug || "-"}
        </span>
      ),
    },
    {
      accessorKey: "transaction.paymentMethod",
      id: "method",
      header: "Method",
      cell: ({ row }) => (
        <span className="text-sm text-muted-foreground">
          {row.original.transaction.paymentMethod || "-"}
        </span>
      ),
    },
    {
      accessorKey: "transaction.status",
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.transaction.status;
        const enriching = row.original.transaction.enrichmentCompleted === false;
        return (
          <div className="flex items-center gap-2">
            <Badge
              variant={
                s === "completed" ? "default" : s === "pending" ? "secondary" : "destructive"
              }
            >
              {s}
            </Badge>
            {enriching && <span className="h-2 w-2 rounded-full bg-amber-500 animate-pulse" />}
          </div>
        );
      },
    },
    {
      accessorKey: "assignedUser",
      id: "assigned",
      header: "Assigned",
      cell: ({ row }) => {
        const u = row.original.assignedUser;
        const label = u?.fullName ?? u?.email ?? "-";
        const initials = (u?.fullName ?? u?.email ?? "-")
          .split(" ")
          .map((n) => n[0])
          .join("")
          .toUpperCase()
          .slice(0, 2);
        return u ? (
          <div className="flex items-center gap-2">
            <Avatar className="h-6 w-6">
              <AvatarFallback className="text-[10px]">{initials || "?"}</AvatarFallback>
            </Avatar>
            <span className="text-sm">{label}</span>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">-</span>
        );
      },
    },
    {
      accessorKey: "tags",
      id: "tags",
      header: "Tags",
      cell: ({ row }) => {
        const tags = row.original.tags ?? [];
        if (!tags.length) return <span className="text-sm text-muted-foreground">-</span>;
        return (
          <div className="flex flex-wrap gap-1 max-w-[220px]">
            {tags.map((t) => (
              <span
                key={t.id}
                className="px-1.5 py-0.5 rounded text-[10px] border"
                style={
                  t.color
                    ? { backgroundColor: `${t.color}15`, borderColor: `${t.color}55` }
                    : undefined
                }
              >
                {t.name}
              </span>
            ))}
          </div>
        );
      },
    },
    {
      accessorKey: "transaction.amount",
      id: "amount",
      header: () => <div className="text-right">Amount</div>,
      cell: ({ row }) => {
        const amount = row.original.transaction.amount;
        const type = row.original.transaction.type;
        return (
          <div className="text-right font-semibold">
            <span
              className={
                type === "payment" ? "text-green-600" : type === "expense" ? "text-red-600" : ""
              }
            >
              {formatAmount({ currency: context.currencyCode, amount })}
            </span>
          </div>
        );
      },
      enableHiding: false,
    },
    {
      id: "actions",
      cell: ({ row }) => {
        const transaction = row.original.transaction;
        const isExcluded = transaction.excludeFromAnalytics;
        const isCompleted = transaction.status === "completed";

        return (
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="sm">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-[180px]">
              <DropdownMenuItem onClick={() => context.onViewDetails(row.original)}>
                View details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => context.onCopyUrl(transaction.id)}>
                Copy share URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() =>
                  context.onToggleStatus(transaction.id, isCompleted ? "pending" : "completed")
                }
              >
                Mark as {isCompleted ? "uncompleted" : "completed"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => context.onToggleExclude(transaction.id, !isExcluded)}
              >
                {isExcluded ? "Include" : "Exclude"} from analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onClick={() => context.onDelete(transaction.id)}
                className="text-destructive"
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
}
