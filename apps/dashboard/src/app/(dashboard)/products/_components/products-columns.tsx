"use client";

import type { ColumnDef } from "@tanstack/react-table";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { MoreHorizontal } from "lucide-react";

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
            <img src={row.original.primaryImage || ""} alt="" className="h-8 w-8 rounded object-cover" />
          ) : (
            <div className="h-8 w-8 rounded bg-muted flex items-center justify-center text-[10px] text-muted-foreground">–</div>
          )}
          <div className="min-w-0">
            <div className="text-sm font-medium truncate">{row.original.product.name}</div>
            <div className="text-xs text-muted-foreground">{row.original.variantsCount} variants</div>
          </div>
        </div>
      ),
    },
    {
      id: "price",
      header: "Price",
      cell: ({ row }) => {
        const { priceMin, priceMax } = row.original;
        if (priceMin == null && priceMax == null) return <span className="text-sm text-muted-foreground">-</span>;
        if (priceMin != null && priceMax != null && priceMin !== priceMax) {
          return (
            <span className="text-sm">
              {new Intl.NumberFormat(undefined, { style: "currency", currency: ctx.currencyCode }).format(priceMin)}
              {" - "}
              {new Intl.NumberFormat(undefined, { style: "currency", currency: ctx.currencyCode }).format(priceMax)}
            </span>
          );
        }
        const v = priceMin ?? priceMax ?? 0;
        return <span className="text-sm">{new Intl.NumberFormat(undefined, { style: "currency", currency: ctx.currencyCode }).format(v)}</span>;
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
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.product.status}</span>,
    },
    {
      id: "actions",
      header: "",
      enableHiding: false,
      cell: ({ row }) => (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="sm">
              <MoreHorizontal className="h-4 w-4" />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end">
            <DropdownMenuItem onSelect={() => ctx.onView(row.original)}>View details</DropdownMenuItem>
            <DropdownMenuItem onSelect={() => ctx.onEdit?.(row.original)}>Edit…</DropdownMenuItem>
            <DropdownMenuItem className="text-destructive" onSelect={() => ctx.onDelete?.(row.original)}>Delete</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ),
    },
  ];
}
