"use client";

import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import { useMemo } from "react";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { trpc } from "@/lib/trpc/client";
import { createProductColumns, type ProductRow } from "./products-columns";
import { useReactTable, getCoreRowModel, flexRender } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInline } from "@/components/search-inline";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import type { FilterFieldDef } from "@/components/filters/types";

type ProductsViewProps = {
  initialProducts?: Array<{
    product: { id: string; name: string; status: "active" | "draft" | "archived"; updatedAt: string | Date };
    variantsCount: number;
    priceMin: number | null;
    priceMax: number | null;
    stockOnHand: number;
    stockAllocated: number;
  }>;
};

export function ProductsView({ initialProducts = [] }: ProductsViewProps) {
  const currency = useTeamCurrency();
  const { data } = trpc.products.list.useQuery(
    { limit: 50 },
    {
      initialData: { items: initialProducts, nextCursor: null } as any,
      placeholderData: keepPreviousData,
      staleTime: 30000,
      refetchOnMount: false,
      refetchOnReconnect: false,
      refetchOnWindowFocus: false,
      retry: false,
    },
  );

  const rows: ProductRow[] = useMemo(() => (data?.items as any) ?? [], [data]);

  const columns = useMemo(() => createProductColumns({ currencyCode: currency, onView: () => {} }), [currency]);
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel() });

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <SearchInline />
      </div>
      <div className="overflow-x-auto">
        <Table className="min-w-[900px]">
          <TableHeader>
            {table.getHeaderGroups().map((hg) => (
              <TableRow key={hg.id}>
                {hg.headers.map((h) => (
                  <TableHead key={h.id}>{h.isPlaceholder ? null : flexRender(h.column.columnDef.header, h.getContext())}</TableHead>
                ))}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {table.getRowModel().rows.map((r) => (
              <TableRow key={r.id}>
                {r.getVisibleCells().map((c) => (
                  <TableCell key={c.id}>{flexRender(c.column.columnDef.cell, c.getContext())}</TableCell>
                ))}
              </TableRow>
            ))}
            {table.getRowModel().rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={columns.length} className="h-24 text-center text-sm text-muted-foreground">No products found.</TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
