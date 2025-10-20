"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { useQueryClient } from "@tanstack/react-query";
import {
  useReactTable,
  getCoreRowModel,
  flexRender,
  type VisibilityState,
} from "@tanstack/react-table";
import { Search, Filter, Download, Plus, Trash2 } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import MultipleSelector, { type Option as MSOption } from "@/components/ui/multiple-selector";

import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/ui/use-toast";
import { EmptyState } from "@/components/empty-state";
import { AddTransactions } from "@/components/add-transactions";
import { BulkActions } from "@/components/bulk-actions";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
import { TransactionDetailsSheetLocal } from "@/components/transaction-details-sheet-local";
import { TransactionCreateSheetLocal } from "@/components/transaction-create-sheet-local";

import { columns, type TransactionRow } from "./columns";

type FilterType = "all" | "payment" | "expense" | "refund" | "adjustment";

type Props = {
  initialTransactions?: any[];
  initialStats?: any;
  initialInvoices?: any[];
};

export function TransactionsView({
  initialTransactions = [],
  initialStats,
  initialInvoices = [],
}: Props) {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  // View state
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statuses, setStatuses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [hasAttachments, setHasAttachments] = useState<"any" | "with" | "without">("any");
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Selection (local Set pattern)
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  // Local sheets
  const [createOpen, setCreateOpen] = useState(false);
  const [detailsId, setDetailsId] = useState<string | undefined>(undefined);

  // Categories for filter
  const { data: categoriesTree } = trpc.transactionCategories.list.useQuery(undefined, {
    enabled: filtersOpen,
  });
  const categoryOptions: MSOption[] = useMemo(() => {
    const flat = flattenCategories((categoriesTree as any) || []);
    return flat.map((c) => ({
      value: c.slug as string,
      label: c.name as string,
      depth: String(c.depth),
      color: (c.color as string | undefined) ?? undefined,
    }));
  }, [categoriesTree]);

  // Inputs for enriched list
  const enrichedInput = useMemo(() => {
    const input: any = {
      type: filterType === "all" ? undefined : (filterType as any),
      status: statuses.length ? (statuses as any) : undefined,
      categories: categories.length ? categories : undefined,
      tags: tags.length ? tags : undefined,
      accounts: accounts.length ? accounts : undefined,
      search: search || undefined,
      startDate: startDate ? new Date(startDate + "T00:00:00Z").toISOString() : undefined,
      endDate: endDate ? new Date(endDate + "T23:59:59Z").toISOString() : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      limit: 50,
    };
    return input;
  }, [
    filterType,
    statuses,
    categories,
    tags,
    accounts,
    search,
    startDate,
    endDate,
    hasAttachments,
    amountMin,
    amountMax,
  ]);

  // Enriched list (regular query instead of infinite to debug)
  const { data: trxData } = trpc.transactions.enrichedList.useQuery(enrichedInput, {
    initialData:
      initialTransactions.length > 0 ? { items: initialTransactions, nextCursor: null } : undefined,
  });
  const transactions = trxData?.items || [];

  // Stats
  const [stats] = trpc.transactions.stats.useSuspenseQuery(undefined, {
    initialData: initialStats,
    staleTime: 30000,
  });

  const currencyCode = useMemo(
    () => (transactions?.[0]?.transaction?.currency ?? "GHS") as string,
    [transactions],
  );
  const rows = transactions;
  const byId = useMemo(
    () => new Map<string, any>(rows.map((r: any) => [r.transaction.id, r])),
    [rows],
  );

  const hasActiveFilters = useMemo(
    () =>
      filterType !== "all" ||
      Boolean(search) ||
      statuses.length > 0 ||
      categories.length > 0 ||
      tags.length > 0 ||
      accounts.length > 0 ||
      hasAttachments !== "any" ||
      Boolean(amountMin) ||
      Boolean(amountMax) ||
      Boolean(startDate) ||
      Boolean(endDate),
    [
      filterType,
      search,
      statuses,
      categories,
      tags,
      accounts,
      hasAttachments,
      amountMin,
      amountMax,
      startDate,
      endDate,
    ],
  );

  const clearAllFilters = () => {
    setFilterType("all");
    setSearch("");
    setStatuses([]);
    setCategories([]);
    setTags([]);
    setAccounts([]);
    setHasAttachments("any");
    setAmountMin("");
    setAmountMax("");
    setStartDate("");
    setEndDate("");
  };

  // Infinite scroll removed for debugging

  // Mutations
  const bulkUpdate = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["transactions", "list"]] }),
        queryClient.invalidateQueries({ queryKey: [["transactions", "stats"]] }),
      ]);
    },
  });
  const bulkDelete = trpc.transactions.bulkDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["transactions", "list"]] }),
        queryClient.invalidateQueries({ queryKey: [["transactions", "stats"]] }),
      ]);
    },
  });

  // Table meta callbacks (memoized to prevent infinite re-renders)
  const toggleSelectedId = useCallback((id: string) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const toggleAllOnPage = useCallback((checked: boolean, ids: string[]) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) ids.forEach((id) => next.add(id));
      else ids.forEach((id) => next.delete(id));
      return next;
    });
  }, []);

  const onViewDetails = useCallback((row: TransactionRow) => {
    setDetailsId(row.transaction.id);
  }, []);

  const onToggleStatus = useCallback(
    async (id: string, status: TransactionRow["transaction"]["status"]) => {
      try {
        await bulkUpdate.mutateAsync({ transactionIds: [id], updates: { status } as any });
        toast({ description: "Transaction updated" });
      } catch {
        toast({ description: "Failed to update transaction", variant: "destructive" });
      }
    },
    [bulkUpdate, toast],
  );

  const onToggleExclude = useCallback(
    async (id: string, exclude: boolean) => {
      try {
        await bulkUpdate.mutateAsync({
          transactionIds: [id],
          updates: { excludeFromAnalytics: exclude },
        });
        toast({ description: exclude ? "Excluded from analytics" : "Included in analytics" });
      } catch {
        toast({ description: "Failed to update transaction", variant: "destructive" });
      }
    },
    [bulkUpdate, toast],
  );

  const onDelete = useCallback(
    async (id: string) => {
      try {
        await bulkDelete.mutateAsync({ transactionIds: [id] });
        toast({ description: "Transaction deleted" });
      } catch {
        toast({ description: "Failed to delete transaction", variant: "destructive" });
      }
    },
    [bulkDelete, toast],
  );

  // Table meta (selection + actions)
  const tableMeta = useMemo(
    () => ({
      isSelected: (id: string) => selected.has(id),
      toggleSelectedId,
      toggleAllOnPage,
      onViewDetails,
      onToggleStatus,
      onToggleExclude,
      onDelete,
    }),
    [
      selected,
      toggleSelectedId,
      toggleAllOnPage,
      onViewDetails,
      onToggleStatus,
      onToggleExclude,
      onDelete,
    ],
  );

  // Prepare data for table
  const tableData: TransactionRow[] = useMemo(
    () =>
      rows.map((row: any) => ({
        transaction: row.transaction,
        client: row.client,
        category: row.category,
      })),
    [rows],
  );

  const table = useReactTable({
    data: tableData,
    columns,
    state: { columnVisibility },
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.transaction.id,
    meta: tableMeta,
  });

  // Export selected CSV
  const exportSelected = () => {
    if (selected.size === 0) return;
    const items = Array.from(selected)
      .map((id) => byId.get(id))
      .filter(Boolean)
      .map((row: any) => ({
        date: new Date(row.transaction.date as any).toISOString(),
        description: row.transaction.description ?? "",
        client: row.client?.name ?? "",
        type: row.transaction.type,
        category: row.category?.name ?? row.transaction.categorySlug ?? "",
        method: row.transaction.paymentMethod ?? "",
        status: row.transaction.status,
        currency: row.transaction.currency,
        amount: Number(row.transaction.amount ?? 0),
        transaction_number: row.transaction.transactionNumber,
      }));
    const headers = Object.keys(items[0] || {});
    const csv = [
      headers.join(","),
      ...items.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${selected.size}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  // Delete confirm handler
  const handleConfirmDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await bulkDelete.mutateAsync({ transactionIds: ids });
      toast({ description: "Transactions deleted" });
      setSelected(new Set());
      setDeleteDialogOpen(false);
    } catch {
      toast({ description: "Failed to delete transactions" });
    }
  };

  return (
    <div className="flex flex-col gap-6 px-6">
      {/* Local sheets (no URL coupling) */}
      <TransactionCreateSheetLocal open={createOpen} onOpenChange={setCreateOpen} />
      <TransactionDetailsSheetLocal
        open={!!detailsId}
        transactionId={detailsId}
        onOpenChange={(open) => !open && setDetailsId(undefined)}
      />

      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterType !== "all" && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setFilterType("all")}
          >
            type:{filterType} ×
          </Badge>
        )}
        {search && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearch("")}>
            search:"{search}" ×
          </Badge>
        )}
        {startDate && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setStartDate("")}>
            from:{startDate} ×
          </Badge>
        )}
        {endDate && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setEndDate("")}>
            to:{endDate} ×
          </Badge>
        )}
        {statuses.map((s) => (
          <Badge
            key={s}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setStatuses((prev) => prev.filter((x) => x !== s))}
          >
            status:{s} ×
          </Badge>
        ))}
        {categories.map((c) => (
          <Badge
            key={c}
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setCategories((prev) => prev.filter((x) => x !== c))}
          >
            cat:{c} ×
          </Badge>
        ))}
        {tags.length > 0 && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setTags([])}>
            tags:{tags.length} ×
          </Badge>
        )}
        {accounts.length > 0 && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setAccounts([])}>
            accounts:{accounts.length} ×
          </Badge>
        )}
        {hasAttachments !== "any" && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => setHasAttachments("any")}
          >
            {hasAttachments === "with" ? "with attachments" : "without attachments"} ×
          </Badge>
        )}
        {(amountMin || amountMax) && (
          <Badge
            variant="secondary"
            className="cursor-pointer"
            onClick={() => {
              setAmountMin("");
              setAmountMax("");
            }}
          >
            amount:{amountMin || 0}-{amountMax || "∞"} ×
          </Badge>
        )}
      </div>

      {/* Bulk selection bar */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Bulk edit</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <BulkActions ids={Array.from(selected)} onComplete={() => setSelected(new Set())} />
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setDeleteDialogOpen(true)}
              className="gap-1"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Stats */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyCode} {(stats as any)?.totalIncome?.toLocaleString?.() || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">All time payments</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Expenses
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyCode} {(stats as any)?.totalExpenses?.toLocaleString?.() || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">All time expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Net Profit</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyCode} {(stats as any)?.netProfit?.toLocaleString?.() || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Income minus expenses</p>
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Pending Payments
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              {currencyCode} {(stats as any)?.pendingPayments?.toLocaleString?.() || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting collection</p>
          </CardContent>
        </Card>
      </div>

      {/* Toolbar */}
      <div>
        <div className="mb-4">
          <div className="flex items-center justify-between gap-4">
            <div className="hidden items-center gap-2 rounded-md border px-3 py-2 text-sm md:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions by description, client, or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-6 w-[360px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
              />
              <Button
                variant="ghost"
                size="icon"
                className="h-6 w-6 hover:bg-transparent"
                onClick={() => setFiltersOpen(true)}
              >
                <Filter className="h-4 w-4 text-muted-foreground" />
              </Button>
            </div>
            <div className="ml-auto flex items-center gap-2">
              <TransactionsColumnVisibility columns={table.getAllColumns()} />
              <Button
                variant="outline"
                size="sm"
                className="gap-2"
                onClick={exportSelected}
                disabled={selectedCount === 0}
              >
                <Download className="h-4 w-4" /> Export{" "}
                {selectedCount > 0 ? `(${selectedCount})` : ""}
              </Button>
              <AddTransactions onCreate={() => setCreateOpen(true)} />
            </div>
          </div>
        </div>

        {/* Table */}
        {!rows.length ? (
          hasActiveFilters ? (
            <EmptyState
              title="No results"
              description="Try another search, or adjusting the filters"
              action={{ label: "Clear filters", onClick: clearAllFilters }}
            />
          ) : (
            <EmptyState
              title="No transactions"
              description={
                <div className="flex flex-col items-center gap-3">
                  <div className="text-muted-foreground text-sm">
                    You haven't recorded any transactions yet.
                  </div>
                  <div className="flex gap-2">
                    <Button size="sm" className="gap-2" onClick={() => setCreateOpen(true)}>
                      <Plus className="h-4 w-4" /> Record transaction
                    </Button>
                  </div>
                </div>
              }
            />
          )
        ) : (
          <div className="overflow-x-auto">
            <Table className="min-w-[1200px]">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        key={header.id}
                        className={
                          header.id === "select"
                            ? "w-10 sticky left-0 z-10 bg-background"
                            : header.id === "date"
                              ? "w-36 sticky left-10 z-10 bg-background"
                              : header.id === "actions"
                                ? "w-[100px]"
                                : ""
                        }
                      >
                        {header.isPlaceholder
                          ? null
                          : flexRender(header.column.columnDef.header, header.getContext())}
                      </TableHead>
                    ))}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row) => (
                    <TableRow
                      key={row.id}
                      className={
                        "hover:bg-muted/50 " +
                        (selected.has((row.original as TransactionRow).transaction.id)
                          ? "data-[state=selected]:bg-muted"
                          : "")
                      }
                    >
                      {row.getVisibleCells().map((cell) => (
                        <TableCell
                          key={cell.id}
                          className={
                            cell.column.id === "select"
                              ? "sticky left-0 z-10 bg-background"
                              : cell.column.id === "date"
                                ? "font-medium sticky left-10 z-10 bg-background w-36"
                                : cell.column.id === "actions"
                                  ? "pr-2"
                                  : ""
                          }
                        >
                          {flexRender(cell.column.columnDef.cell, cell.getContext())}
                        </TableCell>
                      ))}
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={table.getAllColumns().length} className="h-24 text-center">
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        )}

        {/* Infinite scroll removed for debugging */}
      </div>

      {/* Filters Sheet */}
      <Sheet open={filtersOpen} onOpenChange={setFiltersOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Filters</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4 text-sm">
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Type</label>
              <div className="flex flex-wrap gap-2">
                {(["all", "payment", "expense", "refund", "adjustment"] as const).map((t) => (
                  <Button
                    key={t}
                    type="button"
                    size="sm"
                    variant={filterType === t ? "default" : "outline"}
                    onClick={() => setFilterType(t)}
                    className="capitalize"
                  >
                    {t}
                  </Button>
                ))}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">From</label>
                <Input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-3">
                {(["pending", "completed", "failed", "cancelled"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2">
                    <Checkbox
                      checked={statuses.includes(s)}
                      onCheckedChange={(v) =>
                        setStatuses((prev) => (v ? [...prev, s] : prev.filter((x) => x !== s)))
                      }
                    />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Categories</label>
              <MultipleSelector
                options={categoryOptions}
                value={categoryOptions.filter((o) => categories.includes(o.value))}
                onChange={(opts) => setCategories(opts.map((o) => o.value))}
                placeholder="Select categories"
                commandProps={{ className: "border rounded" }}
                renderOption={(opt) => (
                  <div className="flex items-center gap-2">
                    <span
                      style={{ paddingLeft: `${parseInt((opt as any).depth || "0") * 12}px` }}
                    />
                    <span
                      className="inline-block h-3 w-3 rounded-sm border"
                      style={{ backgroundColor: ((opt as any).color as string) || "transparent" }}
                    />
                    <span>{opt.label}</span>
                  </div>
                )}
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Tags (comma separated UUIDs)
              </label>
              <Input
                value={tags.join(",")}
                onChange={(e) =>
                  setTags(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="id1,id2"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">
                Accounts (comma separated UUIDs)
              </label>
              <Input
                value={accounts.join(",")}
                onChange={(e) =>
                  setAccounts(
                    e.target.value
                      .split(",")
                      .map((s) => s.trim())
                      .filter(Boolean),
                  )
                }
                placeholder="accountId1,accountId2"
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Min Amount</label>
                <Input
                  type="number"
                  value={amountMin}
                  onChange={(e) => setAmountMin(e.target.value)}
                />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Max Amount</label>
                <Input
                  type="number"
                  value={amountMax}
                  onChange={(e) => setAmountMax(e.target.value)}
                />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Attachments</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={hasAttachments === "any"}
                    onCheckedChange={() => setHasAttachments("any")}
                  />
                  Any
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={hasAttachments === "with"}
                    onCheckedChange={() => setHasAttachments("with")}
                  />
                  With
                </label>
                <label className="flex items-center gap-2">
                  <Checkbox
                    checked={hasAttachments === "without"}
                    onCheckedChange={() => setHasAttachments("without")}
                  />
                  Without
                </label>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => {
                setStatuses([]);
                setCategories([]);
                setTags([]);
                setAccounts([]);
                setHasAttachments("any");
                setAmountMin("");
                setAmountMax("");
                setStartDate("");
                setEndDate("");
              }}
            >
              Clear
            </Button>
            <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Delete confirm */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete {selectedCount} transaction{selectedCount > 1 ? "s" : ""}?
            </AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleConfirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}

type CategoryNode = {
  id: string;
  name: string;
  slug: string;
  color?: string | null;
  children?: CategoryNode[];
};
function flattenCategories(
  nodes: CategoryNode[],
  depth = 0,
): Array<CategoryNode & { depth: number }> {
  const out: Array<CategoryNode & { depth: number }> = [];
  for (const n of nodes) {
    out.push({ ...n, depth });
    if (n.children && n.children.length) out.push(...flattenCategories(n.children, depth + 1));
  }
  return out;
}
