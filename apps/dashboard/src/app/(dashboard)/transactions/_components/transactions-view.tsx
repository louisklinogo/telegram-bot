"use client";
import { useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Download, Plus, Trash2, Filter } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { AddTransactions } from "@/components/add-transactions";
import { SearchInline } from "@/components/search-inline";
import { BulkActions } from "@/components/bulk-actions";
import { CreateAccountDialog } from "@/components/create-account-dialog";
import { EmptyState } from "@/components/empty-state";
import { TransactionDetailsSheet } from "@/components/transaction-details-sheet";
import { TransactionSheet } from "@/components/transaction-sheet";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useToast } from "@/components/ui/use-toast";
import { useStickyColumns } from "@/hooks/use-sticky-columns";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { formatAmount } from "@/lib/format-currency";
import { trpc } from "@/lib/trpc/client";
import { createTransactionColumns, type TransactionRow } from "./transactions-columns";
import TransactionsSearchFilter from "./transactions-search-filter";
import type { FilterState } from "./types";

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
  const currency = useTeamCurrency();
  const _queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [filterType, setFilterType] = useState<FilterType>("all");
  const [search, setSearch] = useState("");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  // Advanced filter state
  const [statuses, setStatuses] = useState<string[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [accounts, setAccounts] = useState<string[]>([]);
  const [assignees, setAssignees] = useState<string[]>([]);
  const [hasAttachments, setHasAttachments] = useState<"any" | "with" | "without">("any");
  const [isRecurring, setIsRecurring] = useState<boolean | undefined>(undefined);
  const [amountMin, setAmountMin] = useState<string>("");
  const [amountMax, setAmountMax] = useState<string>("");
  const [startDate, setStartDate] = useState<string>("");
  const [endDate, setEndDate] = useState<string>("");
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>(() => {
    try {
      const raw =
        typeof window !== "undefined" ? localStorage.getItem("transactionsColumns") : null;
      return raw ? (JSON.parse(raw) as VisibilityState) : {};
    } catch {
      return {} as VisibilityState;
    }
  });
  const [_deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  // Categories are set via AI parse or elsewhere; no lazy load UI here (Midday parity)

  const enrichedInput = useMemo(() => {
    const input: any = {
      type: filterType === "all" ? undefined : (filterType as any),
      status: statuses.length ? (statuses as any) : undefined,
      categories: categories.length ? categories : undefined,
      tags: tags.length ? tags : undefined,
      accounts: accounts.length ? accounts : undefined,
      assignees: assignees.length ? assignees : undefined,
      isRecurring: isRecurring,
      search: search || undefined,
      startDate: startDate ? new Date(`${startDate}T00:00:00Z`) : undefined,
      endDate: endDate ? new Date(`${endDate}T23:59:59Z`) : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      limit: 50,
    };

    // Remove undefined values to avoid issues
    Object.keys(input).forEach((key) => {
      if (input[key] === undefined) {
        delete input[key];
      }
    });

    return input;
  }, [
    filterType,
    statuses,
    categories,
    tags,
    accounts,
    assignees,
    isRecurring,
    search,
    startDate,
    endDate,
    hasAttachments,
    amountMin,
    amountMax,
  ]);

  // Infinite enriched list
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ rootMargin: "200px" });
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    refetch,
  } = trpc.transactions.enrichedList.useInfiniteQuery(enrichedInput as any, {
    getNextPageParam: (last) => (last as any)?.nextCursor ?? null,
    initialData:
      initialTransactions.length > 0
        ? { pages: [{ items: initialTransactions, nextCursor: null }], pageParams: [null] }
        : undefined,
  });
  useEffect(() => {
    if (loadMoreInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [loadMoreInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Debug: Log the query parameters to see if filters are updating
  console.log("🔍 Filter Debug:", {
    enrichedInput,
    filterCounts: {
      statuses: statuses.length,
      categories: categories.length,
      tags: tags.length,
      accounts: accounts.length,
      assignees: assignees.length,
    },
  });
  const transactions = useMemo(
    () => (infiniteData?.pages || []).flatMap((p: any) => p.items || []),
    [infiniteData],
  );
  const byId = useMemo(
    () => new Map<string, any>(transactions.map((r: any) => [r.transaction.id, r])),
    [transactions],
  );
  const { data: membersData } = trpc.transactions.members.useQuery(undefined, {
    staleTime: 30000,
  });
  const _members = (membersData as any[]) ?? [];
  const currencyCode = currency;
  const hasActiveFilters = useMemo(() => {
    return (
      filterType !== "all" ||
      Boolean(search) ||
      statuses.length > 0 ||
      categories.length > 0 ||
      tags.length > 0 ||
      accounts.length > 0 ||
      assignees.length > 0 ||
      isRecurring != null ||
      hasAttachments !== "any" ||
      Boolean(amountMin) ||
      Boolean(amountMax) ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [
    filterType,
    search,
    statuses,
    categories,
    tags,
    accounts,
    assignees,
    isRecurring,
    hasAttachments,
    amountMin,
    amountMax,
    startDate,
    endDate,
  ]);

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

  // Stats (regular query instead of suspense to debug)
  const { data: stats } = trpc.transactions.stats.useQuery(undefined, {
    initialData: initialStats,
    staleTime: 30000,
  });

  const [allocateOpen, setAllocateOpen] = useState(false);
  const [selectedTrx, setSelectedTrx] = useState<any | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocAmount, setAllocAmount] = useState(0);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const aiParse = trpc.transactions.aiParse.useMutation();
  const invoiceSelectId = useId();
  const allocAmountId = useId();

  const applyParsedFilters = (p: any) => {
    if (!p || typeof p !== "object") return;
    if (p.type !== undefined) setFilterType((p.type as any) || "all");
    if (p.search !== undefined) setSearch(p.search || "");
    if (p.status) setStatuses(p.status as any);
    if (p.statuses) setStatuses(p.statuses as any);
    if (p.categories) setCategories(p.categories as string[]);
    if (p.tags) setTags(p.tags as string[]);
    if (p.accounts) setAccounts(p.accounts as string[]);
    if (p.assignees) setAssignees(p.assignees as string[]);
    if (p.isRecurring !== undefined) setIsRecurring(p.isRecurring as boolean);
    if (p.hasAttachments !== undefined) setHasAttachments(p.hasAttachments ? "with" : "without");
    if (p.amountMin !== undefined) setAmountMin(p.amountMin != null ? String(p.amountMin) : "");
    if (p.amountMax !== undefined) setAmountMax(p.amountMax != null ? String(p.amountMax) : "");
    if (p.startDate !== undefined)
      setStartDate(p.startDate ? new Date(p.startDate).toISOString().slice(0, 10) : "");
    if (p.endDate !== undefined)
      setEndDate(p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : "");
  };

  // ✅ CORRECT: Use initialData from server, match query params with server
  const { data: invoicesResult } = trpc.invoices.list.useQuery(
    { limit: 50 },
    {
      initialData: initialInvoices as any,
      staleTime: 30000, // Don't refetch for 30 seconds
    },
  );
  const invoices = (invoicesResult as any)?.items ?? invoicesResult ?? [];

  const allocateMutation = trpc.transactions.allocate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.enrichedList.invalidate(),
        utils.transactions.list.invalidate(),
        utils.transactions.stats.invalidate(),
        utils.invoices.list.invalidate(),
      ]);
      setAllocateOpen(false);
    },
  });

  const bulkUpdate = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: async () => {
      await Promise.all([
        utils.transactions.enrichedList.invalidate(),
        utils.transactions.list.invalidate(),
        utils.transactions.stats.invalidate(),
      ]);
      setSelected(new Set());
    },
  });
  const bulkDelete = trpc.transactions.bulkDelete.useMutation({
    async onMutate(variables) {
      // Optimistically remove from current list
      await utils.transactions.enrichedList.cancel(enrichedInput as any);
      const previous = utils.transactions.enrichedList.getData(enrichedInput as any);
      if (previous) {
        utils.transactions.enrichedList.setData(
          enrichedInput as any,
          {
            ...previous,
            items: previous.items.filter(
              (r: any) => !(variables.transactionIds ?? []).includes(r.transaction.id),
            ),
          } as any,
        );
      }
      return { previous } as any;
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        utils.transactions.enrichedList.setData(enrichedInput as any, ctx.previous as any);
      }
    },
    onSettled: async () => {
      await Promise.all([
        utils.transactions.enrichedList.invalidate(),
        utils.transactions.list.invalidate(),
        utils.transactions.stats.invalidate(),
      ]);
      setSelected(new Set());
    },
  });

  const rows = transactions;
  const shouldPollForEnrichment = useMemo(() => {
    if (rows.length === 0) return false;
    return !rows[0]?.transaction?.enrichmentCompleted;
  }, [rows]);

  useEffect(() => {
    if (!shouldPollForEnrichment) return;
    const interval = setInterval(() => {
      refetch();
    }, 3000);
    const timeout = setTimeout(() => clearInterval(interval), 60_000);
    return () => {
      clearInterval(interval);
      clearTimeout(timeout);
    };
  }, [shouldPollForEnrichment, refetch]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const lastAnchorIndex = useRef<number | null>(null);
  useEffect(() => {
    if (rows.length === 0) setFocusedIndex(0);
    else if (focusedIndex > rows.length - 1) setFocusedIndex(rows.length - 1);
  }, [rows.length, focusedIndex]);
  // Sticky columns offsets
  const { leftDate } = useStickyColumns();

  const _openAllocate = (row: any) => {
    setSelectedTrx(row);
    setAllocAmount(Number(row.transaction.amount || 0));
    setSelectedInvoiceId("");
    setAllocateOpen(true);
  };

  const _toggleAll = (checked: boolean) => {
    if (!checked) {
      setRowSelection({});
    } else {
      const ids = rows.map((r: any) => r.transaction.id);
      const selection: Record<string, boolean> = {};
      for (const id of ids) selection[id] = true;
      setRowSelection(selection);
    }
  };
  const toggleRow = (id: string, checked: boolean) => {
    setRowSelection((prev) => {
      if (checked) {
        return { ...prev, [id]: true };
      } else {
        const next = { ...prev };
        delete next[id];
        return next;
      }
    });
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
    const csv = [
      headers.join(","),
      ...rows.map((r) => headers.map((h) => JSON.stringify((r as any)[h] ?? "")).join(",")),
    ].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `transactions_${selected.size}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const runBulkUpdate = async (updates: Record<string, unknown>) => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await bulkUpdate.mutateAsync({ transactionIds: ids, updates });
      toast({ description: "Bulk update applied" });
    } catch {
      toast({ description: "Failed to update transactions" });
    }
  };

  const _handleBulkCategory = async (slug: string) => {
    await runBulkUpdate({ categorySlug: slug });
  };

  const _handleBulkStatus = async (status: "pending" | "completed" | "failed" | "cancelled") => {
    await runBulkUpdate({ status });
  };

  const _handleBulkExclude = async (exclude: boolean) => {
    await runBulkUpdate({ excludeFromAnalytics: exclude });
  };

  const _handleBulkAssign = async (assignedId: string | null) => {
    await runBulkUpdate({ assignedId });
  };

  const _handleBulkExport = () => {
    exportSelected();
    toast({ description: `Exported ${selected.size} transactions` });
  };

  const handleConfirmDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      const res = await bulkDelete.mutateAsync({ transactionIds: ids });
      if (res && (res as any).deletedCount === 0) {
        toast({
          description: "Nothing deleted (only manual entries can be deleted)",
          variant: "destructive",
        });
      } else {
        toast({ description: "Transactions deleted" });
      }
      setDeleteDialogOpen(false);
    } catch {
      toast({ description: "Failed to delete transactions" });
    }
  };

  const submitAllocate = async () => {
    if (!selectedTrx || !selectedInvoiceId || allocAmount <= 0) return;
    await allocateMutation.mutateAsync({
      transactionId: selectedTrx.transaction.id,
      invoiceId: selectedInvoiceId,
      amount: allocAmount,
    });
  };

  const { open: openParams } = useTransactionParams();
  const { toast } = useToast();

  // Convert rows to TransactionRow type
  const tableData: TransactionRow[] = useMemo(
    () =>
      rows.map((row: any) => ({
        transaction: row.transaction,
        client: row.client,
        category: row.category,
        assignedUser: row.assignedUser,
        tags: row.tags,
      })),
    [rows],
  );

  // TanStack Table setup
  const columns = useMemo(() => {
    return createTransactionColumns({
      currencyCode,
      onToggleSelection: (_id: string) => {
        // Let TanStack Table handle selection, we'll sync via useEffect
      },
      onViewDetails: (row) => {
        openParams({ transactionId: row.transaction.id });
      },
      onCopyUrl: (id) => {
        try {
          const base = typeof window !== "undefined" ? window.location.origin : "";
          const url = `${base}/transactions/?transactionId=${id}`;
          navigator.clipboard.writeText(url);
          toast({ description: "Transaction URL copied" });
        } catch {
          toast({ description: "Failed to copy URL", variant: "destructive" });
        }
      },
      onToggleStatus: async (id, status) => {
        try {
          await bulkUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status: status as any },
          });
          toast({ description: "Transaction updated" });
        } catch {
          toast({ description: "Failed to update transaction", variant: "destructive" });
        }
      },
      onVoid: async (id) => {
        try {
          await bulkUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status: "cancelled" as any, excludeFromAnalytics: true },
          });
          toast({ description: "Transaction voided" });
        } catch {
          toast({ description: "Failed to void transaction", variant: "destructive" });
        }
      },
      onUnvoid: async (id) => {
        try {
          await bulkUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status: "pending" as any, excludeFromAnalytics: false },
          });
          toast({ description: "Transaction unvoided" });
        } catch {
          toast({ description: "Failed to unvoid transaction", variant: "destructive" });
        }
      },
      onToggleExclude: async (id, exclude) => {
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
      onDelete: async (id) => {
        try {
          const res = await bulkDelete.mutateAsync({ transactionIds: [id] });
          if (res && (res as any).deletedCount === 0) {
            toast({
              description: "Cannot delete this transaction (only manual entries)",
              variant: "destructive",
            });
          } else {
            toast({ description: "Transaction deleted" });
          }
        } catch {
          toast({ description: "Failed to delete transaction", variant: "destructive" });
        }
      },
    });
  }, [currencyCode, bulkUpdate, bulkDelete, toast, openParams]);

  const table = useReactTable({
    data: tableData,
    columns,
    state: {
      rowSelection,
      columnVisibility,
    },
    enableRowSelection: true,
    onRowSelectionChange: setRowSelection,
    onColumnVisibilityChange: setColumnVisibility,
    getCoreRowModel: getCoreRowModel(),
    getRowId: (row) => row.transaction.id,
  });

  // Sync TanStack Table selection with local selected state
  useEffect(() => {
    const selectedIds = new Set(
      table.getSelectedRowModel().rows.map((row) => row.original.transaction.id),
    );
    setSelected(selectedIds);
  }, [table]);

  // Persist column visibility
  useEffect(() => {
    try {
      localStorage.setItem("transactionsColumns", JSON.stringify(columnVisibility));
    } catch {}
  }, [columnVisibility]);

  return (
    <div className="flex flex-col gap-6 px-6">
      <TransactionSheet />
      <TransactionDetailsSheet />

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
      </div>

      {/* Bulk selection bar - Midday style */}
      {selectedCount > 0 && (
        <div className="mb-4 flex items-center justify-between border-b bg-muted/40 px-4 py-3">
          <div className="flex items-center gap-3">
            <span className="text-sm font-medium">Bulk edit</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button size="sm" variant="outline" onClick={_handleBulkExport} className="gap-1">
              <Download className="h-4 w-4" /> Export
            </Button>
            <BulkActions ids={Array.from(selected)} onComplete={() => setSelected(new Set())} />
            <Button size="sm" variant="ghost" onClick={handleConfirmDelete} className="gap-1">
              <Trash2 className="h-4 w-4" />
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
              {formatAmount({ currency: currencyCode, amount: (stats as any)?.totalIncome || 0 })}
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
              {formatAmount({ currency: currencyCode, amount: (stats as any)?.totalExpenses || 0 })}
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
              {formatAmount({ currency: currencyCode, amount: (stats as any)?.netProfit || 0 })}
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
              {formatAmount({
                currency: currencyCode,
                amount: (stats as any)?.pendingPayments || 0,
              })}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting collection</p>
          </CardContent>
        </Card>
      </div>

      <div>
        <div className="mb-4 space-y-4">
          {/* Search and Filter Section */}
          <TransactionsSearchFilter
            value={{
              search,
              statuses: statuses as any,
              categories,
              tags,
              accounts,
              assignees,
              startDate,
              endDate,
              amountMin: amountMin ? parseInt(amountMin, 10) : undefined,
              amountMax: amountMax ? parseInt(amountMax, 10) : undefined,
              hasAttachments:
                hasAttachments === "with" ? true : hasAttachments === "without" ? false : undefined,
              isRecurring,
            }}
            currency={currencyCode}
            onChange={(p: Partial<FilterState>) => {
              if (p.search !== undefined) setSearch(p.search || "");
              if (p.statuses !== undefined) setStatuses(p.statuses || []);
              if (p.categories !== undefined) setCategories(p.categories || []);
              if (p.tags !== undefined) setTags(p.tags || []);
              if (p.accounts !== undefined) setAccounts(p.accounts || []);
              if (p.assignees !== undefined) setAssignees(p.assignees || []);
              if (p.startDate !== undefined) setStartDate(p.startDate || "");
              if (p.endDate !== undefined) setEndDate(p.endDate || "");
              if (p.amountMin !== undefined) setAmountMin(p.amountMin ? String(p.amountMin) : "");
              if (p.amountMax !== undefined) setAmountMax(p.amountMax ? String(p.amountMax) : "");
              if (p.hasAttachments !== undefined)
                setHasAttachments(
                  p.hasAttachments === true
                    ? "with"
                    : p.hasAttachments === false
                      ? "without"
                      : "any",
                );
              if (p.isRecurring !== undefined) setIsRecurring(p.isRecurring);
            }}
            onAskAI={async (q) => {
              const parsed = await aiParse.mutateAsync({ query: q });
              applyParsedFilters(parsed);
              return parsed as any;
            }}
          />

          {/* Notion-like right-aligned toolbar: inline search + filter + controls */}
          <div className="flex items-center justify-end gap-2">
            <div className="hidden sm:flex items-center gap-1">
              <SearchInline />
              <Button
                variant={hasActiveFilters ? "default" : "outline"}
                size="icon"
                aria-label="Filters"
                onClick={() => {
                  // Open filter sheet inside TransactionsSearchFilter via URL param trigger
                  // Simpler: toggle a small local event by setting a custom DOM event
                  document.dispatchEvent(new CustomEvent("transactions:toggle-filters"));
                }}
              >
                <Filter className="h-4 w-4" />
              </Button>
            </div>
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
            <AddTransactions />
          </div>
          {/* Removed top-left filter tabs; Type moved into Filters sheet */}
        </div>

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
                    <Button size="sm" className="gap-2" onClick={() => openParams()}>
                      <Plus className="h-4 w-4" /> Record transaction
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      className="gap-2"
                      onClick={() => setCreateAccountOpen(true)}
                    >
                      Create account
                    </Button>
                    <Button asChild variant="outline" size="sm" className="gap-2">
                      <Link href="/settings/accounts">Manage accounts</Link>
                    </Button>
                  </div>
                </div>
              }
            />
          )
        ) : (
          <div
            className="overflow-x-auto"
            role="application"
            aria-label="Transactions table keyboard navigation"
            onKeyDown={(e) => {
              if (!rows.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                setFocusedIndex((i) => Math.min(i + 1, rows.length - 1));
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                setFocusedIndex((i) => Math.max(i - 1, 0));
            } else if (e.key === "Home") {
              e.preventDefault();
              setFocusedIndex(0);
            } else if (e.key === "End") {
              e.preventDefault();
              setFocusedIndex(rows.length - 1);
            } else if (e.key === " " && e.shiftKey) {
              e.preventDefault();
              const anchor = lastAnchorIndex.current ?? focusedIndex;
              const start = Math.min(anchor, focusedIndex);
              const end = Math.max(anchor, focusedIndex);
              const rangeIds = rows.slice(start, end + 1).map((r: any) => r.transaction.id);
              setRowSelection((prev) => {
                const next = { ...prev } as Record<string, boolean>;
                for (const id of rangeIds) next[id] = true;
                return next;
              });
              } else if (e.key === " " || e.key === "Enter") {
                e.preventDefault();
                const id = rows[focusedIndex]?.transaction?.id;
                if (id) toggleRow(id, !selected.has(id));
              lastAnchorIndex.current = focusedIndex;
              }
            }}
          >
            <Table className="min-w-[1200px]">
              <TableHeader>
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const _isSticky = header.id === "select" || header.id === "date";
                      return (
                        <TableHead
                          key={header.id}
                          className={
                            header.id === "select"
                              ? "w-10 sticky left-0 z-10 bg-background"
                              : header.id === "date"
                                ? `w-36 sticky z-10 bg-background`
                                : header.id === "actions"
                                  ? "w-[100px]"
                                  : ""
                          }
                          data-col-id={header.id === "select" ? "select" : undefined}
                          style={header.id === "date" ? { left: leftDate } : undefined}
                        >
                          {header.isPlaceholder
                            ? null
                            : flexRender(header.column.columnDef.header, header.getContext())}
                        </TableHead>
                      );
                    })}
                  </TableRow>
                ))}
              </TableHeader>
              <TableBody>
                {table.getRowModel().rows.length > 0 ? (
                  table.getRowModel().rows.map((row, idx) => (
                    <TableRow
                      key={row.id}
                      data-state={row.getIsSelected() && "selected"}
                      className={"hover:bg-muted/50 " + (idx === focusedIndex ? "bg-muted/40" : "")}
                      onClick={() => {
                        setFocusedIndex(idx);
                        lastAnchorIndex.current = idx;
                      }}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const _isSticky = cell.column.id === "select" || cell.column.id === "date";
                        return (
                          <TableCell
                            key={cell.id}
                            className={
                              cell.column.id === "select"
                                ? "sticky left-0 z-10 bg-background"
                                : cell.column.id === "date"
                                  ? "font-medium sticky z-10 bg-background w-36"
                                  : cell.column.id === "actions"
                                    ? "pr-2"
                                    : ""
                            }
                            style={cell.column.id === "date" ? { left: leftDate } : undefined}
                          >
                            {flexRender(cell.column.columnDef.cell, cell.getContext())}
                          </TableCell>
                        );
                      })}
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
        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} />
      </div>

      {/* Filters popover/sheet removed — Midday uses AI-first search without separate filter surface */}

      {/* BottomBar: show when filters are active */}
      {hasActiveFilters && (
        <div className="fixed bottom-4 left-1/2 z-50 -translate-x-1/2 rounded-lg border bg-background shadow-lg">
          <div className="flex items-center gap-3 px-4 py-2">
            <span className="text-sm">Filters active</span>
            <Button size="sm" variant="ghost" onClick={clearAllFilters}>
              Clear filters
            </Button>
          </div>
        </div>
      )}

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
              <label className="text-sm font-medium" htmlFor={invoiceSelectId}>
                Invoice
              </label>
              <select
                id={invoiceSelectId}
                value={selectedInvoiceId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                className="w-full rounded border px-3 py-2 text-sm"
              >
                <option value="">Select invoice…</option>
                {invoices.map((r: any) => (
                  <option key={r.invoice.id} value={r.invoice.id}>
                    {(r.invoice as any).invoiceNumber} · {r.client?.name || "-"} ·{" "}
                    {(r.invoice as any).currency ?? ""} {Number(r.invoice.amount || 0)}
                  </option>
                ))}
              </select>
            </div>
            <div className="space-y-2">
              <label className="text-sm font-medium" htmlFor={allocAmountId}>
                Amount
              </label>
              <Input
                id={allocAmountId}
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

      {/* Create Account Dialog */}
      <CreateAccountDialog open={createAccountOpen} onOpenChange={setCreateAccountOpen} />
    </div>
  );
}

// Filter sheet helpers removed; AI search drives filters directly
