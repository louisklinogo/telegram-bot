"use client";
import { keepPreviousData, useQueryClient } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { Download, Plus, Trash2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { parseAsArrayOf, parseAsBoolean, parseAsInteger, parseAsString, useQueryState, useQueryStates } from "nuqs";
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
import { Icons } from "@/components/ui/icons";
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
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import { FilterDropdown } from "@/components/filters/filter-dropdown";
import type { FilterFieldDef } from "@/components/filters/types";
import { TransactionsAnalyticsCarousel } from "./transactions-analytics-carousel";

type FilterType = "all" | "payment" | "expense" | "refund" | "adjustment";

type TransactionsViewProps = {
  initialTransactions?: any[];
  initialStats?: any;
  initialSpending?: any[];
  initialRecent?: any[];
  initialInvoices?: any[];
};

export function TransactionsView({
  initialTransactions = [],
  initialStats,
  initialSpending,
  initialRecent,
  initialInvoices = [],
}: TransactionsViewProps) {
  const currency = useTeamCurrency();
  const _queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const [q] = useQueryState("q", { defaultValue: "" });
  const [filters, setFilters] = useQueryStates(
    {
      type: parseAsString,
      statuses: parseAsArrayOf(parseAsString),
      categories: parseAsArrayOf(parseAsString),
      tags: parseAsArrayOf(parseAsString),
      accounts: parseAsArrayOf(parseAsString),
      assignees: parseAsArrayOf(parseAsString),
      start: parseAsString,
      end: parseAsString,
      amount_range: parseAsArrayOf(parseAsInteger),
      attachments: parseAsString, // "include" | "exclude"
      recurring: parseAsBoolean,
    },
    { shallow: true },
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  // Advanced filter state
  const rawType = (filters.type as string | undefined) ?? undefined;
  const allowedTypes = new Set<FilterType>(["payment", "expense", "refund", "adjustment"]);
  const filterType: FilterType = rawType && allowedTypes.has(rawType as FilterType)
    ? (rawType as FilterType)
    : "all";
  const statuses: string[] = filters.statuses ?? [];
  const categories: string[] = filters.categories ?? [];
  const tags: string[] = filters.tags ?? [];
  const accounts: string[] = filters.accounts ?? [];
  const assignees: string[] = filters.assignees ?? [];
  const startDate: string = filters.start ?? "";
  const endDate: string = filters.end ?? "";
  const amountRange: number[] | undefined = filters.amount_range ?? undefined;
  const amountMin: number | undefined = amountRange?.[0] ?? undefined;
  const amountMax: number | undefined = amountRange?.[1] ?? undefined;
  const hasAttachments: "any" | "with" | "without" = filters.attachments
    ? filters.attachments === "include"
      ? "with"
      : "without"
    : "any";
  const isRecurring: boolean | undefined = filters.recurring ?? undefined;
  // fulfilled filter removed
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
    const includeTags = columnVisibility?.tags !== false; // load tags only if column is visible
    const input: any = {
      type: filterType === "all" ? undefined : (filterType as any),
      status: statuses.length ? (statuses as any) : undefined,
      categories: categories.length ? categories : undefined,
      tags: tags.length ? tags : undefined,
      accounts: accounts.length ? accounts : undefined,
      assignees: assignees.length ? assignees : undefined,
      isRecurring: isRecurring,
      search: q || undefined,
      startDate: startDate ? new Date(`${startDate}T00:00:00Z`) : undefined,
      endDate: endDate ? new Date(`${endDate}T23:59:59Z`) : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin != null ? Number(amountMin) : undefined,
      amountMax: amountMax != null ? Number(amountMax) : undefined,
      includeTags,
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
    q,
    startDate,
    endDate,
    hasAttachments,
    amountMin,
    amountMax,
    columnVisibility,
  ]);

  // Infinite enriched list
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ rootMargin: "200px" });
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
  } = trpc.transactions.enrichedList.useInfiniteQuery(enrichedInput as any, {
    getNextPageParam: (last) => (last as any)?.nextCursor ?? null,
    initialData:
      initialTransactions.length > 0
        ? { pages: [{ items: initialTransactions, nextCursor: null }], pageParams: [null] }
        : undefined,
    placeholderData: keepPreviousData,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
  });
  useEffect(() => {
    if (loadMoreInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [loadMoreInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  // Debug log removed to avoid noise and unnecessary console overhead
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
      Boolean(q) ||
      statuses.length > 0 ||
      categories.length > 0 ||
      tags.length > 0 ||
      accounts.length > 0 ||
      assignees.length > 0 ||
      isRecurring != null ||
      hasAttachments !== "any" ||
      amountMin != null ||
      amountMax != null ||
      Boolean(startDate) ||
      Boolean(endDate)
    );
  }, [
    filterType,
    q,
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

  // Options for filter pills (for supported controls)
  const typeOptions = useMemo(
    () => [
      { value: "payment", label: "Payment" },
      { value: "expense", label: "Expense" },
      { value: "refund", label: "Refund" },
      { value: "adjustment", label: "Adjustment" },
    ],
    [],
  );
  const statusOptionsPill = useMemo(
    () => [
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    [],
  );

  // Optional dynamic options (light queries; cached)
  const { data: categoriesList = [] } = trpc.transactionCategories.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: tagsList = [] } = trpc.tags.list.useQuery(undefined, { staleTime: 60_000 });
  const { data: accountsList = [] } = trpc.financialAccounts.list.useQuery(undefined, {
    staleTime: 60_000,
  });
  const { data: membersList = [] } = trpc.teams.members.useQuery(undefined, { staleTime: 60_000 });

  // New reusable filter fields
  const filterFields: FilterFieldDef[] = useMemo(
    () => [
      { key: "type", label: "Type", type: "select", options: typeOptions },
      { key: "statuses", label: "Status", type: "multi", options: statusOptionsPill },
      {
        key: "categories",
        label: "Category",
        type: "multi",
        options: (categoriesList as any[]).map((c) => ({ value: String(c.slug), label: String(c.name || c.slug) })),
      },
      {
        key: "tags",
        label: "Tags",
        type: "multi",
        options: (tagsList as any[]).map((t) => ({ value: String(t.id), label: String(t.name) })),
      },
      {
        key: "accounts",
        label: "Accounts",
        type: "multi",
        options: (accountsList as any[]).map((a) => ({
          value: String(a.id),
          label: String(a.currency ? `${a.name} (${a.currency})` : a.name),
        })),
      },
      {
        key: "assignees",
        label: "Assignees",
        type: "multi",
        options: (membersList as any[]).map((m) => ({
          value: String(m.id),
          label: String(m.fullName || m.email || "Unknown"),
        })),
      },
      { key: "dateRange", label: "Date Range", type: "date_range", map: { start: "startDate", end: "endDate" } },
      { key: "amountRange", label: "Amount", type: "number_range", map: { min: "amountMin", max: "amountMax" } },
      { key: "hasAttachments", label: "Attachments", type: "boolean" },
      { key: "isRecurring", label: "Recurring", type: "boolean" },
    ],
    [typeOptions, statusOptionsPill, categoriesList, tagsList, accountsList, membersList],
  );

  const clearAllFilters = () => {
    setFilters({
      type: null,
      statuses: null,
      categories: null,
      tags: null,
      accounts: null,
      assignees: null,
      start: null,
      end: null,
      amount_range: null,
      attachments: null,
      recurring: null,
    });
  };

  // Removed redundant stats query – analytics cards handle their own data

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
    setFilters({
      type: (p.type as any) ?? null,
      statuses: (p.statuses as any) ?? (p.status as any) ?? null,
      categories: (p.categories as any) ?? null,
      tags: (p.tags as any) ?? null,
      accounts: (p.accounts as any) ?? null,
      assignees: (p.assignees as any) ?? null,
      recurring: typeof p.isRecurring === "boolean" ? p.isRecurring : null,
      attachments:
        p.hasAttachments === undefined ? null : p.hasAttachments ? "include" : "exclude",
      amount_range:
        p.amountMin != null || p.amountMax != null
          ? [p.amountMin ?? 0, p.amountMax ?? 500000]
          : null,
      start: p.startDate
        ? new Date(p.startDate).toISOString().slice(0, 10)
        : null,
      end: p.endDate ? new Date(p.endDate).toISOString().slice(0, 10) : null,
    });
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
        utils.transactions.spending.invalidate(),
        utils.transactions.recentLite.invalidate(),
      ]);
      setSelected(new Set());
    },
  });
  const bulkDelete = trpc.transactions.bulkDelete.useMutation({
    async onMutate(variables) {
      // Optimistically remove from current list
      await utils.transactions.enrichedList.cancel(enrichedInput as any);
      const previous = utils.transactions.enrichedList.getData(enrichedInput as any) as
        | { pages: Array<{ items: any[]; nextCursor?: string | null }>; pageParams: any[] }
        | undefined;
      const ids = new Set((variables as any).transactionIds ?? []);
      if (previous) {
        const next = {
          ...previous,
          pages: previous.pages.map((p) => ({
            ...p,
            items: (p.items || []).filter((r: any) => !ids.has(r.transaction.id)),
          })),
        } as any;
        utils.transactions.enrichedList.setData(enrichedInput as any, next);
      }
      // Also update all cached filtered lists to avoid ghost rows when switching filters
      try {
        const entries = _queryClient.getQueriesData({ queryKey: ["transactions", "enrichedList"] });
        for (const [key, data] of entries) {
          const d: any = data as any;
          if (!d || !d.pages) continue;
          const next = {
            ...d,
            pages: d.pages.map((p: any) => ({
              ...p,
              items: (p.items || []).filter((r: any) => !ids.has(r.transaction.id)),
            })),
          };
          _queryClient.setQueryData(key as any, next);
        }
      } catch {}
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
        utils.transactions.spending.invalidate(),
        utils.transactions.recentLite.invalidate(),
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
  const widgetsRef = useRef<HTMLDivElement | null>(null);

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
  }, [rowSelection, table]);

  // Persist column visibility
  useEffect(() => {
    try {
      localStorage.setItem("transactionsColumns", JSON.stringify(columnVisibility));
    } catch {}
  }, [columnVisibility]);

  return (
    <div className="flex flex-col gap-6">
      <TransactionSheet />
      <TransactionDetailsSheet />

      {/* Active filter chips removed — pills row is the single source of truth */}

      {/* Bulk selection bar (mobile fallback only) */}
      {selectedCount > 0 && (
        <div className="sm:hidden mb-4 flex items-center justify-between border-b bg-muted/40 px-4 py-3">
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

      {/* Analytics carousel */}
      <TransactionsAnalyticsCarousel initialStats={initialStats} initialSpending={initialSpending} initialRecent={initialRecent} />

      <div>
        <div className="mb-4 space-y-4">
          {/* Row 1: Right-aligned toolbar (search, filter icon, column visibility, export, add) */}
          <div className="hidden sm:grid grid-cols-[420px,1fr,auto] items-center gap-2 sticky top-0 z-10 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/80 px-1 py-1 rounded">
            {/* Left column: reserved slot for bulk actions (fixed width) */}
            <div className="min-w-0">
              {selectedCount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground">{selectedCount} selected</span>
                  <BulkActions ids={Array.from(selected)} onComplete={() => setSelected(new Set())} />
                  <Button
                    variant="outline"
                    size="sm"
                    className="gap-1"
                    onClick={_handleBulkExport}
                  >
                    <Download className="h-4 w-4" /> Export
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleConfirmDelete} className="gap-1">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={() => setRowSelection({})}>
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="opacity-0 pointer-events-none select-none h-9" />
              )}
            </div>

            {/* Middle column: spacer to keep layout stable */}
            <div className="min-w-0" />

            {/* Right column: filters and controls */}
            <div className="flex items-center justify-end gap-2">
              <SearchInline />
              <FilterDropdown
              values={{
                statuses,
                categories,
                tags,
                accounts,
                assignees,
                startDate,
                endDate,
                amountMin,
                amountMax,
                  attachments: hasAttachments === "any" ? undefined : hasAttachments === "with" ? "include" : "exclude",
              }}
              onChange={(n) => {
                setFilters({
                  statuses: n.statuses ?? null,
                  categories: n.categories ?? null,
                  tags: n.tags ?? null,
                  accounts: n.accounts ?? null,
                  assignees: n.assignees ?? null,
                  start: n.startDate ?? null,
                  end: n.endDate ?? null,
                  amount_range:
                    n.amountMin != null || n.amountMax != null
                      ? [n.amountMin ?? 0, n.amountMax ?? 500000]
                      : null,
                    attachments: n.attachments ?? null,
                });
              }}
              />
              <TransactionsColumnVisibility columns={table.getAllColumns()} />
              {selectedCount === 0 && (
                <Button
                  variant="outline"
                  size="icon"
                  aria-label="Export"
                  onClick={exportSelected}
                >
                  <Download className="h-4 w-4" />
                </Button>
              )}
              <AddTransactions />
            </div>
          </div>

          {/* Row 2: Left pills + +Filter, Right Reset only */}
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-1">
              <FilterToolbar
                appearance="chip"
                fields={filterFields}
                values={{
                  type: filterType === "all" ? undefined : filterType,
                  statuses,
                  categories,
                  tags,
                  accounts,
                  assignees,
                  dateRange: { startDate, endDate },
                amountRange: { amountMin, amountMax },
                  hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
                  isRecurring,
                }}
                onChange={(next) => {
                  setFilters({
                    type: (next.type as any) ?? null,
                    statuses: (next.statuses as any) ?? null,
                    categories: (next.categories as any) ?? null,
                    tags: (next.tags as any) ?? null,
                    accounts: (next.accounts as any) ?? null,
                    assignees: (next.assignees as any) ?? null,
                    start: (next as any).dateRange?.startDate ?? null,
                    end: (next as any).dateRange?.endDate ?? null,
                  amount_range:
                    (next as any).amountRange?.amountMin != null || (next as any).amountRange?.amountMax != null
                      ? [
                          (next as any).amountRange?.amountMin ?? 0,
                          (next as any).amountRange?.amountMax ?? 500000,
                        ]
                      : null,
                    attachments:
                      (next as any).hasAttachments === undefined
                        ? null
                        : (next as any).hasAttachments
                          ? "include"
                          : "exclude",
                    recurring: (next.isRecurring as any) ?? null,
                  });
                }}
              />
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button variant="ghost" size="sm" onClick={clearAllFilters}>
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Using Notion-style pills + picker only; legacy sheet UI removed */}
        </div>

        {!rows.length ? (
          hasActiveFilters ? (
            <EmptyState
              title="No results"
              description="Try another search, or adjust the filters."
              action={{ label: "Clear filters", onClick: clearAllFilters }}
            />
          ) : accountsList.length === 0 ? (
            <EmptyState
              title="No transactions"
              description="Connect or add an account to start importing transactions and unlock insights."
              action={{ label: "Add account", onClick: () => setCreateAccountOpen(true) }}
            />
          ) : (
            <EmptyState
              title="No transactions"
              description="Record your first transaction to get started."
              action={{ label: "Record transaction", onClick: () => openParams() }}
            />
          )
        ) : (
          <div
            className="relative overflow-x-auto"
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
            {isFetching && !isFetchingNextPage ? (
              <div className="absolute left-0 right-0 top-0 h-0.5 bg-primary/70 animate-pulse" />
            ) : null}
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
                      onClick={(e) => {
                        setFocusedIndex(idx);
                        lastAnchorIndex.current = idx;
                        if (selectedCount > 0) return;
                        const target = e.target as HTMLElement | null;
                        const interactive = target?.closest(
                          'button, a, input, select, textarea, [role="button"], [role="menuitem"], [data-row-click-exempt]'
                        );
                        if (!interactive) {
                          const id = row.original.transaction.id;
                          if (id) openParams({ transactionId: id });
                        }
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
        <div ref={loadMoreRef as any} />
      </div>

      {/* No floating bottom bar; Reset lives on the pills row */}

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
