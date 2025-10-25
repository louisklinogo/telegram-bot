"use client";

import type { RouterOutputs } from "@Faworra/api/trpc/routers/_app";
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
import { TagsCell } from "./tags-cell";

export type TransactionRow = {
  transaction: {
    id: string;
    date: string | Date;
    description: string | null;
    paymentReference?: string | null;
    type: "payment" | "expense" | "refund" | "adjustment";
    status: "pending" | "completed" | "failed" | "cancelled" | null;
    amount: number | string;
    categorySlug?: string | null;
    paymentMethod?: string | null;
    excludeFromAnalytics?: boolean | null;
    enrichmentCompleted?: boolean | null;
    manual?: boolean | null;
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
  onToggleStatus: (
    id: string,
    status: NonNullable<TransactionRow["transaction"]["status"]>
  ) => void;
  onToggleExclude: (id: string, exclude: boolean) => void;
  onVoid: (id: string) => void;
  onUnvoid: (id: string) => void;
  onDelete: (id: string) => void;
  onMenuOpenChange?: (open: boolean) => void;
};

export function createTransactionColumns(context: ColumnContext): ColumnDef<TransactionRow>[] {
  return [
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          aria-label="Select all"
          checked={
            table.getIsAllPageRowsSelected() ||
            (table.getIsSomePageRowsSelected() && "indeterminate")
          }
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          aria-label="Select row"
          checked={row.getIsSelected()}
          onCheckedChange={(value) => {
            row.toggleSelected(!!value);
          }}
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
          <p className="font-medium text-sm">{row.original.transaction.description}</p>
          {row.original.transaction.paymentReference && (
            <p className="text-muted-foreground text-xs">
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
      cell: ({ row }) => {
        const t = row.original.transaction.type;
        const label = t.charAt(0).toUpperCase() + t.slice(1);
        const cls =
          t === "payment"
            ? "bg-green-100 text-green-700 border-green-200"
            : t === "expense"
              ? "bg-red-100 text-red-700 border-red-200"
              : t === "refund"
                ? "bg-purple-100 text-purple-700 border-purple-200"
                : "bg-sky-100 text-sky-700 border-sky-200"; // adjustment
        return (
          <Badge
            className={"rounded-full px-2.5 py-0.5 font-medium text-xs" + cls}
            variant="outline"
          >
            {label}
          </Badge>
        );
      },
      enableHiding: true,
    },
    {
      accessorKey: "category.name",
      id: "category",
      header: "Category",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">
          {row.original.category?.name || row.original.transaction.categorySlug || "-"}
        </span>
      ),
    },
    {
      accessorKey: "transaction.paymentMethod",
      id: "method",
      header: "Method",
      cell: ({ row }) => {
        const raw = row.original.transaction.paymentMethod || "";
        const label = raw
          ? raw
              .toString()
              .split("_")
              .map((p) => (p ? p[0].toUpperCase() + p.slice(1).toLowerCase() : p))
              .join(" ")
          : "-";
        return <span className="text-muted-foreground text-sm">{label}</span>;
      },
    },
    {
      accessorKey: "transaction.status",
      id: "status",
      header: "Status",
      cell: ({ row }) => {
        const s = row.original.transaction.status ?? "pending";
        const enriching = s === "pending" && row.original.transaction.enrichmentCompleted === false;
        const label = s.charAt(0).toUpperCase() + s.slice(1);
        const cls =
          s === "completed"
            ? "bg-green-100 text-green-700 border-green-200"
            : s === "pending"
              ? "bg-amber-100 text-amber-700 border-amber-200"
              : s === "failed"
                ? "bg-red-100 text-red-700 border-red-200"
                : "bg-slate-100 text-slate-700 border-slate-200"; // cancelled
        return (
          <Badge
            className={
              "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 font-medium text-xs" +
              cls
            }
            variant="outline"
          >
            {s === "completed" && (
              <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-green-500" />
            )}
            {s === "pending" && (
              <span
                aria-hidden
                className={
                  "h-1.5 w-1.5 rounded-full bg-amber-500" + (enriching ? "animate-pulse" : "")
                }
              />
            )}
            {label}
          </Badge>
        );
      },
    },
    {
      accessorKey: "transaction.manual",
      id: "origin",
      header: "Origin",
      cell: ({ row }) => {
        const isManual = !!row.original.transaction.manual;
        const textCls = isManual ? "text-slate-700" : "text-[#878787]";
        return (
          <span
            className={
              "rounded-full border border-border px-2 py-1 font-mono text-[10px]" + textCls
            }
          >
            {isManual ? "Manual" : "System"}
          </span>
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
          <span className="text-muted-foreground text-sm">-</span>
        );
      },
    },
    {
      accessorKey: "tags",
      id: "tags",
      header: "Tags",
      cell: ({ row }) => (
        <TagsCell
          initialTags={row.original.tags ?? []}
          transactionId={row.original.transaction.id}
        />
      ),
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
              {formatAmount({ currency: context.currencyCode, amount: Number(amount) })}
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
          <DropdownMenu onOpenChange={context.onMenuOpenChange}>
            <DropdownMenuTrigger asChild>
              <Button data-row-click-exempt size="sm" variant="ghost">
                <MoreHorizontal className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              align="end"
              className="w-[180px]"
              forceMount
              onCloseAutoFocus={(e) => e.preventDefault()}
            >
              <DropdownMenuItem
                onSelect={() => setTimeout(() => context.onViewDetails(row.original), 0)}
              >
                View details
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimeout(() => context.onViewDetails(row.original), 0)}
              >
                Edit tags…
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimeout(() => context.onCopyUrl(transaction.id), 0)}
              >
                Copy share URL
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                onSelect={() =>
                  setTimeout(
                    () =>
                      context.onToggleStatus(transaction.id, isCompleted ? "pending" : "completed"),
                    0
                  )
                }
              >
                Mark as {isCompleted ? "uncompleted" : "completed"}
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimeout(() => context.onVoid(transaction.id), 0)}
              >
                Void
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() => setTimeout(() => context.onUnvoid(transaction.id), 0)}
              >
                Unvoid
              </DropdownMenuItem>
              <DropdownMenuItem
                onSelect={() =>
                  setTimeout(() => context.onToggleExclude(transaction.id, !isExcluded), 0)
                }
              >
                {isExcluded ? "Include" : "Exclude"} from analytics
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="text-destructive"
                disabled={!transaction.manual}
                onSelect={() => setTimeout(() => context.onDelete(transaction.id), 0)}
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
