"use client";

import { keepPreviousData, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download } from "lucide-react";
import dynamic from "next/dynamic";
import { parseAsArrayOf, parseAsString, useQueryStates } from "nuqs";
import { useEffect, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { EmptyState } from "@/components/empty-state";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { SearchInline } from "@/components/search-inline";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { createProductColumns, type ProductRow } from "./products-columns";

const ProductSheet = dynamic(() => import("./product-sheet").then((m) => m.ProductSheet), {
  ssr: false,
  loading: () => null,
});
const VariantsSheet = dynamic(() => import("./variants-sheet").then((m) => m.VariantsSheet), {
  ssr: false,
  loading: () => null,
});

import { Plus } from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import { trpc } from "@/lib/trpc/client";

type ProductsViewProps = {
  initialProducts?: Array<{
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
  }>;
};

export function ProductsView({ initialProducts = [] }: ProductsViewProps) {
  const currency = useTeamCurrency();
  const router = useRouter();
  const params = useSearchParams();
  const isSheetOpen =
    (params.get("new") === "1" || !!params.get("productId")) && params.get("variants") !== "1";
  const utils = trpc.useUtils();
  const [{ statuses, category }, setFilters] = useQueryStates(
    {
      statuses: parseAsArrayOf(parseAsString),
      category: parseAsString,
    },
    { shallow: true }
  );
  const del = trpc.products.delete.useMutation({
    onSuccess: async () => {
      await utils.products.list.invalidate();
    },
  });
  type Cursor = { updatedAt: string | Date; id: string } | null;
  type Page = { items: ProductRow[]; nextCursor: Cursor };
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ rootMargin: "200px" });
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    error,
    refetch,
  } = useSuspenseInfiniteQuery({
    queryKey: ["products.list", { statuses, category }],
    queryFn: async ({ pageParam }): Promise<Page> => {
      const res = await utils.client.products.list.query({
        limit: 50,
        status: Array.isArray(statuses) && statuses.length ? (statuses as any) : undefined,
        categorySlug: category || undefined,
        cursor: pageParam as any,
      });
      return res as unknown as Page;
    },
    getNextPageParam: (last) => last?.nextCursor ?? null,
    initialPageParam: null as Cursor,
    initialData:
      initialProducts && initialProducts.length > 0
        ? ({
            pages: [{ items: initialProducts as any, nextCursor: null }],
            pageParams: [null],
          } as any)
        : undefined,
    staleTime: 30_000,
    refetchOnReconnect: false,
    refetchOnWindowFocus: false,
    retry: false,
  });

  useEffect(() => {
    if (loadMoreInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [loadMoreInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const rows: ProductRow[] = useMemo(
    () => (infiniteData?.pages || []).flatMap((p: any) => p.items || []),
    [infiniteData]
  );

  const prefetched = useRef<Set<string>>(new Set());
  const columns = useMemo(
    () =>
      createProductColumns({
        currencyCode: currency,
        onView: () => {},
        onEdit: (row) => router.push(`/products?productId=${row.product.id}`),
        onDelete: async (row) => {
          try {
            await del.mutateAsync({ id: row.product.id } as any);
          } catch {}
        },
        onPrefetch: (row) => {
          const id = row.product.id;
          if (!prefetched.current.has(id)) {
            prefetched.current.add(id);
            void utils.products.details.prefetch({ id });
          }
          // Inventory locations are team-global; prefetch once and keep forever
          void utils.products.inventoryLocations.prefetch();
        },
      }),
    [currency, router, del]
  );
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw = typeof window !== "undefined" ? localStorage.getItem("productsColumns") : null;
      return raw ? (JSON.parse(raw) as VisibilityState) : {};
    } catch {
      return {} as VisibilityState;
    }
  });
  const table = useReactTable({
    data: rows,
    columns,
    getCoreRowModel: getCoreRowModel(),
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
  });

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
    const csv = [
      headers.join(","),
      ...data.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")),
    ].join("\n");
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
        <div className="sticky top-0 z-10 hidden grid-cols-[420px,1fr,auto] items-center gap-2 rounded bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:grid">
          {/* Left reserved slot to keep layout stable */}
          <div className="min-w-0">
            <div className="pointer-events-none h-9 select-none opacity-0" />
          </div>
          {/* Middle spacer */}
          <div className="min-w-0" />
          {/* Right controls */}
          <div className="flex items-center justify-end gap-2">
            <SearchInline />
            <TransactionsColumnVisibility columns={table.getAllColumns()} />
            <Button aria-label="Export" onClick={exportRows} size="icon" variant="outline">
              <Download className="h-4 w-4" />
            </Button>
            <Button onClick={() => router.push("/products?new=1")} size="sm">
              {" "}
              <Plus className="mr-1 h-4 w-4" /> Add
            </Button>
          </div>
        </div>
        <div className="flex items-center justify-between">
          <FilterToolbar
            appearance="chip"
            fields={[
              {
                key: "statuses",
                label: "Status",
                type: "multi",
                options: [
                  { value: "active", label: "Active" },
                  { value: "draft", label: "Draft" },
                  { value: "archived", label: "Archived" },
                ],
              },
              { key: "category", label: "Category", type: "select" },
            ]}
            onChange={(next) => {
              setFilters({
                statuses: (next.statuses as any) ?? null,
                category: (next.category as any) ?? null,
              });
            }}
            values={{ statuses: statuses ?? [], category }}
          />
          {(Array.isArray(statuses) && statuses.length) || category ? (
            <Button
              onClick={() => setFilters({ statuses: null, category: null })}
              size="sm"
              variant="ghost"
            >
              Reset
            </Button>
          ) : null}
        </div>
      </div>

      {error ? (
        <EmptyState
          action={{ label: "Retry", onClick: () => refetch() }}
          description="There was a problem loading the list."
          title="Could not load products"
        />
      ) : rows.length === 0 ? (
        <EmptyState
          action={{ label: "Add product", onClick: () => router.push("/products?new=1") }}
          description="Add your first product to get started."
          title="No products"
        />
      ) : (
        (() => {
          const tableContainerRef = useRef<HTMLDivElement>(null);
          const allRows = table.getRowModel().rows;
          const rowVirtualizer = useVirtualizer({
            count: allRows.length,
            getScrollElement: () => tableContainerRef.current,
            estimateSize: () => 60,
            overscan: 10,
            enabled: allRows.length > 50,
          });
          const virtualItems = rowVirtualizer.getVirtualItems();
          const totalSize = rowVirtualizer.getTotalSize();
          const paddingTop = virtualItems.length > 0 ? virtualItems[0]?.start || 0 : 0;
          const paddingBottom =
            virtualItems.length > 0
              ? totalSize - (virtualItems[virtualItems.length - 1]?.end || 0)
              : 0;

          return (
            <div
              className="relative max-h-[calc(100vh-400px)] overflow-auto"
              ref={tableContainerRef}
            >
              <Table className="min-w-[900px]">
                <TableHeader className="sticky top-0 z-10 bg-background">
                  {table.getHeaderGroups().map((hg) => (
                    <TableRow key={hg.id}>
                      {hg.headers.map((h) => (
                        <TableHead key={h.id}>
                          {h.isPlaceholder
                            ? null
                            : flexRender(h.column.columnDef.header, h.getContext())}
                        </TableHead>
                      ))}
                    </TableRow>
                  ))}
                </TableHeader>
                <TableBody>
                  {allRows.length > 0 ? (
                    <>
                      {paddingTop > 0 && (
                        <tr>
                          <td style={{ height: `${paddingTop}px` }} />
                        </tr>
                      )}
                      {(allRows.length > 50
                        ? virtualItems
                        : allRows.map((_, i) => ({ index: i }) as any)
                      ).map((vr: any) => {
                        const row = allRows[vr.index];
                        if (!row) return null;
                        return (
                          <TableRow key={row.id}>
                            {row.getVisibleCells().map((c) => (
                              <TableCell key={c.id}>
                                {flexRender(c.column.columnDef.cell, c.getContext())}
                              </TableCell>
                            ))}
                          </TableRow>
                        );
                      })}
                      {paddingBottom > 0 && (
                        <tr>
                          <td style={{ height: `${paddingBottom}px` }} />
                        </tr>
                      )}
                      {isFetching && !isFetchingNextPage ? (
                        <tr>
                          <td colSpan={table.getAllColumns().length}>
                            <div className="h-8 text-muted-foreground text-sm">Loading…</div>
                          </td>
                        </tr>
                      ) : null}
                    </>
                  ) : (
                    <TableRow>
                      <TableCell
                        className="h-24 text-center"
                        colSpan={table.getAllColumns().length}
                      >
                        No results.
                      </TableCell>
                    </TableRow>
                  )}
                </TableBody>
              </Table>
              <div className="h-8" ref={loadMoreRef} />
            </div>
          );
        })()
      )}
      {isSheetOpen ? <ProductSheet /> : null}
      {params.get("variants") === "1" && params.get("productId") ? <VariantsSheet /> : null}
    </div>
  );
}
