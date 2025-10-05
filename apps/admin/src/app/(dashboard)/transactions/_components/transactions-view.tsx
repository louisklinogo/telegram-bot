"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import { Download, Filter, Plus, Search, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Sheet,
  SheetContent,
  SheetFooter,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { trpc } from "@/lib/trpc/client";
import { TransactionSheet } from "@/components/transaction-sheet";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { EmptyState } from "@/components/empty-state";

type FilterType = "all" | "payment" | "expense" | "refund" | "adjustment";

type TransactionsViewProps = {
  initialTransactions?: any[];
  initialStats?: any;
  initialInvoices?: any[];
};

export function TransactionsView({
  initialTransactions = [],
  initialStats,
  initialInvoices = [],
}: TransactionsViewProps) {
  const queryClient = useQueryClient();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  // Advanced filter state
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
  }, [filterType, statuses, categories, tags, accounts, search, startDate, endDate, hasAttachments, amountMin, amountMax]);

  const [trxPages, { fetchNextPage, hasNextPage, isFetchingNextPage }] = trpc.transactions.enrichedList.useSuspenseInfiniteQuery(
    enrichedInput,
    {
      getNextPageParam: (last) => (last as any)?.nextCursor ?? null,
      initialData: initialTransactions.length > 0
        ? {
            pages: [{ items: initialTransactions, nextCursor: null }],
            pageParams: [null],
          }
        : undefined,
    }
  );
  const transactions = (trxPages?.pages || []).flatMap((p: any) => p?.items || []);
  const byId = new Map<string, any>(transactions.map((r: any) => [r.transaction.id, r]));
  const currencyCode = useMemo(() => (transactions?.[0]?.transaction?.currency ?? "GHS") as string, [transactions]);
  const hasActiveFilters = useMemo(() => {
    return (
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
      Boolean(endDate)
    );
  }, [filterType, search, statuses, categories, tags, accounts, hasAttachments, amountMin, amountMax, startDate, endDate]);

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
  
  // ✅ CORRECT: Use initialData from server
  const [stats] = trpc.transactions.stats.useSuspenseQuery(
    undefined,
    {
      initialData: initialStats,
      staleTime: 30000, // Don't refetch for 30 seconds
    }
  );

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocAmount, setAllocAmount] = useState(0);

  // ✅ CORRECT: Use initialData from server, match query params with server
  const [invoicesResult] = trpc.invoices.list.useSuspenseQuery(
    { limit: 50 },
    {
      initialData: initialInvoices as any,
      staleTime: 30000, // Don't refetch for 30 seconds
    }
  );
  const invoices = (invoicesResult as any)?.items ?? invoicesResult ?? [];

  const allocateMutation = trpc.transactions.allocate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["transactions", "list"]] }),
        queryClient.invalidateQueries({ queryKey: [["transactions", "stats"]] }),
        queryClient.invalidateQueries({ queryKey: [["invoices", "list"]] }),
      ]);
      setAllocateOpen(false);
    },
  });

  const bulkUpdate = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["transactions", "list"]] }),
        queryClient.invalidateQueries({ queryKey: [["transactions", "stats"]] }),
      ]);
      setSelected(new Set());
    },
  });
  const bulkDelete = trpc.transactions.bulkDelete.useMutation({
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: [["transactions", "list"]] }),
        queryClient.invalidateQueries({ queryKey: [["transactions", "stats"]] }),
      ]);
      setSelected(new Set());
    },
  });

  const rows = transactions;
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (rows.length === 0) setFocusedIndex(0);
    else if (focusedIndex > rows.length - 1) setFocusedIndex(rows.length - 1);
  }, [rows.length]);
  useEffect(() => {
    if (!hasNextPage) return;
    const el = loadMoreRef.current;
    if (!el) return;
    const io = new IntersectionObserver((entries) => {
      const first = entries[0];
      if (first.isIntersecting) {
        fetchNextPage();
      }
    }, { rootMargin: "200px" });
    io.observe(el);
    return () => io.disconnect();
  }, [hasNextPage, fetchNextPage]);

  const openAllocate = (row: any) => {
    setSelectedTrx(row);
    setAllocAmount(Number(row.transaction.amount || 0));
    setSelectedInvoiceId("");
    setAllocateOpen(true);
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) return setSelected(new Set());
    const ids = rows.map((r: any) => r.transaction.id);
    setSelected(new Set(ids));
  };
  const toggleRow = (id: string, checked: boolean) => {
    setSelected((prev) => {
      const next = new Set(prev);
      if (checked) next.add(id);
      else next.delete(id);
      return next;
    });
  };

  const [bulkStatus, setBulkStatus] = useState<"pending" | "completed" | "failed" | "cancelled" | "">("");
  const [bulkCategory, setBulkCategory] = useState("");
  const [bulkAssignId, setBulkAssignId] = useState("");

  const applyBulkUpdate = async () => {
    if (selected.size === 0) return;
    await bulkUpdate.mutateAsync({
      transactionIds: Array.from(selected),
      updates: {
        categorySlug: bulkCategory || undefined,
        status: (bulkStatus || undefined) as any,
        assignedId: bulkAssignId ? bulkAssignId : undefined,
      },
    });
  };
  const applyBulkDelete = async () => {
    if (selected.size === 0) return;
    await bulkDelete.mutateAsync({ transactionIds: Array.from(selected) });
  };

  const exportSelected = () => {
    if (selected.size === 0) return;
    const rows = Array.from(selected)
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
    const headers = Object.keys(rows[0] || {});
    const csv = [headers.join(","), ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${selected.size}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const submitAllocate = async () => {
    if (!selectedTrx || !selectedInvoiceId || allocAmount <= 0) return;
    await allocateMutation.mutateAsync({
      transactionId: selectedTrx.transaction.id,
      invoiceId: selectedInvoiceId,
      amount: allocAmount,
    });
  };

  const { open: openTransactionSheet } = useTransactionParams();

  return (
    <div className="flex flex-col gap-6 px-6">
      <TransactionSheet />
      

      {/* Active filter chips */}
      <div className="flex flex-wrap gap-2">
        {filterType !== "all" && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setFilterType("all")}>type:{filterType} ×</Badge>
        )}
        {search && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setSearch("")}>search:"{search}" ×</Badge>
        )}
        {startDate && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setStartDate("")}>from:{startDate} ×</Badge>
        )}
        {endDate && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setEndDate("")}>to:{endDate} ×</Badge>
        )}
        {statuses.map((s) => (
          <Badge key={s} variant="secondary" className="cursor-pointer" onClick={() => setStatuses((prev) => prev.filter((x) => x !== s))}>status:{s} ×</Badge>
        ))}
        {categories.map((c) => (
          <Badge key={c} variant="secondary" className="cursor-pointer" onClick={() => setCategories((prev) => prev.filter((x) => x !== c))}>cat:{c} ×</Badge>
        ))}
        {tags.length > 0 && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setTags([])}>tags:{tags.length} ×</Badge>
        )}
        {accounts.length > 0 && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setAccounts([])}>accounts:{accounts.length} ×</Badge>
        )}
        {hasAttachments !== "any" && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => setHasAttachments("any")}>
            {hasAttachments === "with" ? "with attachments" : "without attachments"} ×
          </Badge>
        )}
        {(amountMin || amountMax) && (
          <Badge variant="secondary" className="cursor-pointer" onClick={() => { setAmountMin(""); setAmountMax(""); }}>
            amount:{amountMin || 0}-{amountMax || "∞"} ×
          </Badge>
        )}
      </div>

      {selectedCount > 0 && (
        <div className="flex flex-col gap-2 rounded-md border bg-muted/30 p-3 md:flex-row md:items-end md:justify-between">
          <div className="text-sm font-medium">{selectedCount} selected</div>
          <div className="flex flex-col gap-2 md:flex-row md:items-center">
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Status</label>
              <select
                value={bulkStatus}
                onChange={(e) => setBulkStatus(e.target.value as any)}
                className="h-8 rounded border px-2 text-sm"
              >
                <option value="">—</option>
                <option value="pending">pending</option>
                <option value="completed">completed</option>
                <option value="failed">failed</option>
                <option value="cancelled">cancelled</option>
              </select>
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Category</label>
              <Input value={bulkCategory} onChange={(e) => setBulkCategory(e.target.value)} placeholder="category-slug" className="h-8 w-44" />
            </div>
            <div className="flex items-center gap-2">
              <label className="text-xs text-muted-foreground">Assign</label>
              <Input value={bulkAssignId} onChange={(e) => setBulkAssignId(e.target.value)} placeholder="user-id (uuid)" className="h-8 w-60" />
            </div>
            <Button size="sm" onClick={applyBulkUpdate} disabled={bulkUpdate.isPending}>
              {bulkUpdate.isPending ? "Updating…" : "Apply"}
            </Button>
            <Button size="sm" variant="destructive" onClick={applyBulkDelete} disabled={bulkDelete.isPending}>
              <Trash2 className="mr-1 h-4 w-4" /> {bulkDelete.isPending ? "Deleting…" : "Delete (manual only)"}
            </Button>
          </div>
        </div>
      )}

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

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-4">
            <div className="hidden items-center gap-2 rounded-md border px-3 py-2 text-sm md:flex">
              <Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search transactions by description, client, or reference..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="h-6 w-[360px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <div className="ml-auto flex items-center gap-2">
              <Button variant="outline" size="sm" className="gap-2" onClick={() => setFiltersOpen(true)}>
                <Filter className="h-4 w-4" /> Filters
              </Button>
              <Button variant="outline" size="sm" className="gap-2" onClick={exportSelected} disabled={selectedCount === 0}>
                <Download className="h-4 w-4" /> Export {selectedCount > 0 ? `(${selectedCount})` : ""}
              </Button>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button size="sm" className="gap-2">
                    <Plus className="h-4 w-4" /> Add
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-56">
                  <DropdownMenuItem asChild>
                    <Link href="/dashboard/settings">Create account</Link>
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => openTransactionSheet()}>Record transaction</DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem disabled>Import CSV (soon)</DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
          {/* Removed top-left filter tabs; Type moved into Filters sheet */}
        </CardHeader>
        <CardContent>
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
                    <div className="text-[#606060] text-sm">
                      You haven't recorded any transactions yet.
                    </div>
                    <div className="flex gap-2">
                      <Button size="sm" className="gap-2" onClick={() => openTransactionSheet()}>
                        <Plus className="h-4 w-4" /> Record transaction
                      </Button>
                      <Button asChild variant="outline" size="sm" className="gap-2">
                        <Link href="/dashboard/settings">Create account</Link>
                      </Button>
                    </div>
                  </div>
                }
              />
            )
          ) : (
            <div
              className="overflow-x-auto"
              tabIndex={0}
              onKeyDown={(e) => {
                if (!rows.length) return;
                if (e.key === "ArrowDown") {
                  e.preventDefault();
                  setFocusedIndex((i) => Math.min(i + 1, rows.length - 1));
                } else if (e.key === "ArrowUp") {
                  e.preventDefault();
                  setFocusedIndex((i) => Math.max(i - 1, 0));
                } else if (e.key === " " || e.key === "Enter") {
                  e.preventDefault();
                  const id = rows[focusedIndex]?.transaction?.id;
                  if (id) toggleRow(id, !selected.has(id));
                }
              }}
            >
            <Table className="min-w-[1200px]">
              <TableHeader>
                <TableRow>
                  <TableHead className="w-10 sticky left-0 z-10 bg-background">
                    <Checkbox
                      checked={selectedCount > 0 && selectedCount === rows.length}
                      onCheckedChange={(v) => toggleAll(Boolean(v))}
                      aria-label="Select all"
                    />
                  </TableHead>
                  <TableHead className="w-36 sticky left-10 z-10 bg-background">Date</TableHead>
                  <TableHead>Description</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Type</TableHead>
                  <TableHead>Category</TableHead>
                  <TableHead>Method</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Amount</TableHead>
                  <TableHead className="w-[80px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row: any, idx: number) => (
                  <TableRow key={row.transaction.id} className={"hover:bg-muted/50 " + (idx === focusedIndex ? "ring-1 ring-primary/40" : "")} onClick={() => setFocusedIndex(idx)}>
                    <TableCell className="sticky left-0 z-10 bg-background">
                      <Checkbox
                        checked={selected.has(row.transaction.id)}
                        onCheckedChange={(v) => toggleRow(row.transaction.id, Boolean(v))}
                        aria-label="Select row"
                      />
                    </TableCell>
                    <TableCell className="font-medium sticky left-10 z-10 bg-background w-36">
                      {new Date(row.transaction.date as any).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{row.transaction.description}</p>
                        {row.transaction.paymentReference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {row.transaction.paymentReference}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{row.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.transaction.type === "payment"
                            ? "default"
                            : row.transaction.type === "expense"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {row.transaction.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.category?.name || row.transaction.categorySlug || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.transaction.paymentMethod || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.transaction.status === "completed"
                            ? "default"
                            : row.transaction.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {row.transaction.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span
                        className={
                          row.transaction.type === "payment"
                            ? "text-green-600"
                            : row.transaction.type === "expense"
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {row.transaction.type === "expense" && "-"}
                        {row.transaction.currency}
                        {Number(row.transaction.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.transaction.type === "payment" && (
                        <Button size="sm" variant="outline" onClick={() => openAllocate(row)}>
                          Allocate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
            </div>
          )}
          {hasNextPage && (
            <div className="pt-4">
              <div ref={loadMoreRef} className="h-8" />
              <Button
                variant="ghost"
                onClick={() => fetchNextPage()}
                disabled={!hasNextPage || isFetchingNextPage}
              >
                {isFetchingNextPage ? "Loading…" : "Load more"}
              </Button>
            </div>
          )}
        </CardContent>
      </Card>

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
                {(["all","payment","expense","refund","adjustment"] as const).map((t) => (
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
                <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">To</label>
                <Input type="date" value={endDate} onChange={(e) => setEndDate(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Status</label>
              <div className="flex flex-wrap gap-3">
                {(["pending","completed","failed","cancelled"] as const).map((s) => (
                  <label key={s} className="flex items-center gap-2">
                    <Checkbox checked={statuses.includes(s)} onCheckedChange={(v) => setStatuses((prev) => v ? [...prev, s] : prev.filter((x) => x !== s))} />
                    <span className="capitalize">{s}</span>
                  </label>
                ))}
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Categories (comma separated slugs)</label>
              <Input value={categories.join(",")} onChange={(e) => setCategories(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="sales,fees,shipping" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Tags (comma separated UUIDs)</label>
              <Input value={tags.join(",")} onChange={(e) => setTags(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="id1,id2" />
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Accounts (comma separated UUIDs)</label>
              <Input value={accounts.join(",")} onChange={(e) => setAccounts(e.target.value.split(",").map((s) => s.trim()).filter(Boolean))} placeholder="accountId1,accountId2" />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Min Amount</label>
                <Input type="number" value={amountMin} onChange={(e) => setAmountMin(e.target.value)} />
              </div>
              <div>
                <label className="mb-1 block text-xs text-muted-foreground">Max Amount</label>
                <Input type="number" value={amountMax} onChange={(e) => setAmountMax(e.target.value)} />
              </div>
            </div>
            <div>
              <label className="mb-1 block text-xs text-muted-foreground">Attachments</label>
              <div className="flex items-center gap-3">
                <label className="flex items-center gap-2"><Checkbox checked={hasAttachments === "any"} onCheckedChange={() => setHasAttachments("any")} />Any</label>
                <label className="flex items-center gap-2"><Checkbox checked={hasAttachments === "with"} onCheckedChange={() => setHasAttachments("with")} />With</label>
                <label className="flex items-center gap-2"><Checkbox checked={hasAttachments === "without"} onCheckedChange={() => setHasAttachments("without")} />Without</label>
              </div>
            </div>
          </div>
          <SheetFooter>
            <Button variant="outline" onClick={() => { setStatuses([]); setCategories([]); setTags([]); setAccounts([]); setHasAttachments("any"); setAmountMin(""); setAmountMax(""); setStartDate(""); setEndDate(""); }}>Clear</Button>
            <Button onClick={() => setFiltersOpen(false)}>Apply</Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Allocate Sheet */}
      <Sheet open={allocateOpen} onOpenChange={setAllocateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Allocate Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Transaction: {selectedTrx?.transaction?.transactionNumber} • Amount:{" "}
              {selectedTrx?.transaction?.currency}
              {Number(selectedTrx?.transaction?.amount || 0).toLocaleString()}
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Invoice</label>
              <select
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Select invoice…</option>
                {invoices.map((r: any) => (
                  <option key={r.invoice.id} value={r.invoice.id}>
                    {(r.invoice as any).invoiceNumber} · {r.client?.name || "-"} · {(r.invoice as any).currency ?? ""} {Number(r.invoice.amount || 0)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium">Amount</label>
              <Input
                type="number"
                step="0.01"
                value={allocAmount}
                onChange={(e) => setAllocAmount(parseFloat(e.target.value) || 0)}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              variant="outline"
              onClick={() => setAllocateOpen(false)}
              disabled={allocateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              onClick={submitAllocate}
              disabled={!selectedInvoiceId || allocAmount <= 0 || allocateMutation.isPending}
            >
              {allocateMutation.isPending ? "Allocating…" : "Allocate"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>
    </div>
  );
}
