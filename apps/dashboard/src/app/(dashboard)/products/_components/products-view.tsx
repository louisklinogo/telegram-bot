"use client";

import { keepPreviousData } from "@tanstack/react-query";
import { useEffect, useMemo, useState } from "react";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { useRouter } from "next/navigation";
import { trpc } from "@/lib/trpc/client";
import { createProductColumns, type ProductRow } from "./products-columns";
import { useReactTable, getCoreRowModel, flexRender, type VisibilityState } from "@tanstack/react-table";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { SearchInline } from "@/components/search-inline";
import { Button } from "@/components/ui/button";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
import { Download } from "lucide-react";
import { EmptyState } from "@/components/empty-state";

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
  const router = useRouter();
  const { data, error, refetch } = trpc.products.list.useQuery(
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("productsColumns") : null;
      return raw ? (JSON.parse(raw) as VisibilityState) : {};
    } catch {
      return {} as VisibilityState;
    }
  });
  const table = useReactTable({ data: rows, columns, getCoreRowModel: getCoreRowModel(), state: { columnVisibility }, onColumnVisibilityChange: setColumnVisibility });

  useEffect(() => {
    try {
      localStorage.setItem("productsColumns", JSON.stringify(columnVisibility));
    } catch {}
  }, [columnVisibility]);

  const exportRows = () => {
    if (!rows.length) return;
    const data = rows.map((r) => ({
      name: r.product.name,
      status: r.product.status,
      variants: r.variantsCount,
      price_min: r.priceMin ?? "",
      price_max: r.priceMax ?? "",
      stock_on_hand: r.stockOnHand,
      stock_allocated: r.stockAllocated,
    }));
    const headers = Object.keys(data[0] || {});
    const csv = [headers.join(","), ...data.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `products_${rows.length}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Analytics carousel space */}
      <div className="pt-6">
        <div className="h-[200px]" />
      </div>

      <div className="mb-4 space-y-4">
        {/* Right-aligned toolbar like Transactions */}
        <div className="hidden sm:grid grid-cols-[420px,1fr,auto] items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-1 py-1 rounded">
          {/* Left reserved slot to keep layout stable */}
          <div className="min-w-0">
            <div className="opacity-0 pointer-events-none select-none h-9" />
          </div>
          {/* Middle spacer */}
          <div className="min-w-0" />
          {/* Right controls */}
          <div className="flex items-center justify-end gap-2">
            <SearchInline />
            <TransactionsColumnVisibility columns={table.getAllColumns()} />
            <Button variant="outline" size="icon" aria-label="Export" onClick={exportRows}>
              <Download className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {error ? (
        <EmptyState
          title="Could not load products"
          description="There was a problem loading the list."
          action={{ label: "Retry", onClick: () => refetch() }}
        />
      ) : rows.length === 0 ? (
        <EmptyState
          title="No products"
          description="Add your first product to get started."
          action={{ label: "Add product", onClick: () => router.push("/products?new=1") }}
        />
      ) : (
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
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
