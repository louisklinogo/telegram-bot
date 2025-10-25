"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { MoreHorizontal } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

export type ProductRow = {
  product: {
    id: string;
    name: string;
    status: "active" | "draft" | "archived";
    updatedAt: string | Date;
  };
  variantsCount: number;
  priceMin: number | null;
  priceMax: number | null;
  stockOnHand: number;
  stockAllocated: number;
  primaryImage?: string | null;
};

type ColumnContext = {
  currencyCode: string;
  onView: (row: ProductRow) => void;
  onEdit?: (row: ProductRow) => void;
  onDelete?: (row: ProductRow) => void;
  onPrefetch?: (row: ProductRow) => void;
};

export function createProductColumns(ctx: ColumnContext): ColumnDef<ProductRow>[] {
  return [
    {
      accessorKey: "product.name",
      header: "Product",
      cell: ({ row }) => (
        <div className="flex items-center gap-2">
          {row.original.primaryImage ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              alt=""
              className="h-8 w-8 rounded object-cover"
              src={row.original.primaryImage || ""}
            />
          ) : (
            <div className="flex h-8 w-8 items-center justify-center rounded bg-muted text-[10px] text-muted-foreground">
              –
            </div>
          )}
          <div className="min-w-0">
            <div className="truncate font-medium text-sm">{row.original.product.name}</div>
            <div className="text-muted-foreground text-xs">
              {row.original.variantsCount} variants
            </div>
          </div>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const { priceMin, priceMax } = row.original;
        if (priceMin == null && priceMax == null)
          return <span className="text-muted-foreground text-sm">-</span>;
        if (priceMin != null && priceMax != null && priceMin !== priceMax) {
          return (
            <span className="text-sm">
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: ctx.currencyCode,
              }).format(priceMin)}
              {" - "}
              {new Intl.NumberFormat(undefined, {
                style: "currency",
                currency: ctx.currencyCode,
              }).format(priceMax)}
            </span>
          );
        }
        const v = priceMin ?? priceMax ?? 0;
        return (
          <span className="text-sm">
            {new Intl.NumberFormat(undefined, {
              style: "currency",
              currency: ctx.currencyCode,
            }).format(v)}
          </span>
        );
      },
    },
    {
      id: "stock",
      header: "Stock",
      cell: ({ row }) => {
        const available = row.original.stockOnHand - row.original.stockAllocated;
        return <span className="text-sm">{available}</span>;
      },
    },
    {
      accessorKey: "product.status",
      header: "Status",
      cell: ({ row }) => (
        <span className="text-muted-foreground text-sm">{row.original.product.status}</span>
      ),
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button size="sm" variant="ghost">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => ctx.onView(row.original)}>
              View details
            </DropdownMenuItem>
            <DropdownMenuItem
              onFocus={() => ctx.onPrefetch?.(row.original)}
              onPointerEnter={() => ctx.onPrefetch?.(row.original)}
              onSelect={() => ctx.onEdit?.(row.original)}
            >
              Edit…
            </DropdownMenuItem>
            <DropdownMenuItem
              className="text-destructive"
              onSelect={() => ctx.onDelete?.(row.original)}
            >
              Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
