"use client";
import type { RouterOutputs } from "@Faworra/api/trpc/routers/_app";
import { createBrowserClient } from "@Faworra/supabase/client";
import { useQueryClient, useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  type RowSelectionState,
  useReactTable,
  type VisibilityState,
} from "@tanstack/react-table";
import { useVirtualizer } from "@tanstack/react-virtual";
import { Download, Trash2 } from "lucide-react";
import {
  parseAsArrayOf,
  parseAsBoolean,
  parseAsInteger,
  parseAsString,
  useQueryState,
  useQueryStates,
} from "nuqs";
import { useEffect, useId, useMemo, useRef, useState } from "react";
import { useInView } from "react-intersection-observer";
import { AddTransactions } from "@/components/add-transactions";
import { BulkActions } from "@/components/bulk-actions";
import { CreateAccountDialog } from "@/components/create-account-dialog";
import { EmptyState } from "@/components/empty-state";
import { FilterDropdown } from "@/components/filters/filter-dropdown";
import { FilterToolbar } from "@/components/filters/filter-toolbar";
import type { FilterFieldDef } from "@/components/filters/types";
import { SearchInline } from "@/components/search-inline";
import { TransactionDetailsSheet } from "@/components/transaction-details-sheet";
import { TransactionSheet } from "@/components/transaction-sheet";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
import { Button } from "@/components/ui/button";
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
import { trpc } from "@/lib/trpc/client";
import { useTransactionsInvalidation } from "../_hooks/use-transactions-invalidation";
import { TransactionsAnalyticsCarousel } from "./transactions-analytics-carousel";
import { createTransactionColumns, type TransactionRow } from "./transactions-columns";

type FilterType = "all" | "payment" | "expense" | "refund" | "adjustment";

type EnrichedItem = RouterOutputs["transactions"]["enrichedList"]["items"][number];
type Stats = RouterOutputs["transactions"]["stats"];
type Spending = RouterOutputs["transactions"]["spending"];
type RecentLite = RouterOutputs["transactions"]["recentLite"];
type InvoicesList = RouterOutputs["invoices"]["list"];

type EnrichedListInput = {
  type?: "payment" | "expense" | "refund" | "adjustment";
  status?: ("pending" | "completed" | "failed" | "cancelled")[];
  categories?: string[];
  tags?: string[];
  assignedId?: string;
  assignees?: string[];
  isRecurring?: boolean;
  search?: string;
  startDate?: string;
  endDate?: string;
  hasAttachments?: boolean;
  accounts?: string[];
  amountMin?: number;
  amountMax?: number;
  includeTags?: boolean;
  limit?: number;
  cursor?: { date: string | null; id: string } | null;
};

type TransactionsViewProps = {
  initialTransactions?: EnrichedItem[];
  initialStats?: Stats;
  initialSpending?: Spending;
  initialRecent?: RecentLite;
  initialInvoices?: InvoicesList;
};

export function TransactionsView({
  initialTransactions = [],
  initialStats,
  initialSpending,
  initialRecent,
  initialInvoices,
}: TransactionsViewProps) {
  const currency = useTeamCurrency();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();
  const invalidateTransactions = useTransactionsInvalidation();
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
    { shallow: true }
  );
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const selectedCount = selected.size;

  // Advanced filter state
  const rawType = (filters.type as string | undefined) ?? undefined;
  const allowedTypes = new Set<FilterType>(["payment", "expense", "refund", "adjustment"]);
  const filterType: FilterType =
    rawType && allowedTypes.has(rawType as FilterType) ? (rawType as FilterType) : "all";
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

  // Categories are set via AI parse or elsewhere; no lazy load UI here (Midday parity)

  const enrichedInput = useMemo<EnrichedListInput>(() => {
    const sort = (arr?: string[]) => (Array.isArray(arr) ? [...arr].sort() : undefined);
    const statusesSorted = sort(statuses);
    const categoriesSorted = sort(categories);
    const tagsSorted = sort(tags);
    const accountsSorted = sort(accounts);
    const assigneesSorted = sort(assignees);
    const includeTags = columnVisibility?.tags !== false; // load tags only if column is visible
    const input: EnrichedListInput = {
      type: filterType === "all" ? undefined : filterType,
      status:
        statusesSorted && statusesSorted.length
          ? (statusesSorted as EnrichedListInput["status"])
          : undefined,
      categories: categoriesSorted && categoriesSorted.length ? categoriesSorted : undefined,
      tags: tagsSorted && tagsSorted.length ? tagsSorted : undefined,
      accounts: accountsSorted && accountsSorted.length ? accountsSorted : undefined,
      assignees: assigneesSorted && assigneesSorted.length ? assigneesSorted : undefined,
      isRecurring,
      search: q || undefined,
      startDate: startDate ? `${startDate}T00:00:00.000Z` : undefined,
      endDate: endDate ? `${endDate}T23:59:59.000Z` : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin != null ? Number(amountMin) : undefined,
      amountMax: amountMax != null ? Number(amountMax) : undefined,
      includeTags,
      limit: 50,
    };

    // Remove undefined values to avoid issues
    const cleaned = Object.fromEntries(
      Object.entries(input).filter(([, v]) => v !== undefined)
    ) as EnrichedListInput;

    return cleaned;
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

  // ✅ CORRECT: Use useSuspenseInfiniteQuery for optimal performance (Phase A+B pattern)
  const { ref: loadMoreRef, inView: loadMoreInView } = useInView({ rootMargin: "200px" });
  type Cursor = { date: string | null; id: string };
  type EnrichedPage = { items: EnrichedItem[]; nextCursor: Cursor | null };
  const {
    data: infiniteData,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isFetching,
    refetch,
    error: listError,
  } = useSuspenseInfiniteQuery({
    ...utils.transactions.enrichedList.infiniteQueryOptions(enrichedInput, {
      getNextPageParam: (last: EnrichedPage) => last?.nextCursor ?? null,
    }),
    initialData:
      initialTransactions && initialTransactions.length > 0
        ? ({
            pages: [{ items: initialTransactions, nextCursor: null } as EnrichedPage],
            pageParams: [null],
          } as { pages: EnrichedPage[]; pageParams: Array<Cursor | null> })
        : undefined,
    staleTime: 15_000,
    refetchOnWindowFocus: false,
    refetchOnReconnect: false,
    retry: false,
  });

  useEffect(() => {
    if (loadMoreInView && hasNextPage && !isFetchingNextPage) fetchNextPage();
  }, [loadMoreInView, hasNextPage, isFetchingNextPage, fetchNextPage]);

  const transactions = useMemo<EnrichedItem[]>(
    () => (infiniteData?.pages || []).flatMap((p) => p.items || []),
    [infiniteData]
  );

  const byId = useMemo(
    () => new Map<string, EnrichedItem>(transactions.map((r) => [r.transaction.id, r])),
    [transactions]
  );
  const currencyCode = currency;
  const hasActiveFilters = useMemo(
    () =>
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
      Boolean(endDate),
    [
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
    ]
  );

  // Options for filter pills (for supported controls)
  const typeOptions = useMemo(
    () => [
      { value: "payment", label: "Payment" },
      { value: "expense", label: "Expense" },
      { value: "refund", label: "Refund" },
      { value: "adjustment", label: "Adjustment" },
    ],
    []
  );
  const statusOptionsPill = useMemo(
    () => [
      { value: "completed", label: "Completed" },
      { value: "pending", label: "Pending" },
      { value: "failed", label: "Failed" },
      { value: "cancelled", label: "Cancelled" },
    ],
    []
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
        options: categoriesList.map((c: any) => ({
          value: String(c.slug),
          label: String(c.name || c.slug),
        })),
      },
      {
        key: "tags",
        label: "Tags",
        type: "multi",
        options: tagsList.map((t: any) => ({ value: String(t.id), label: String(t.name) })),
      },
      {
        key: "accounts",
        label: "Accounts",
        type: "multi",
        options: accountsList.map((a: any) => ({
          value: String(a.id),
          label: String(a.currency ? `${a.name} (${a.currency})` : a.name),
        })),
      },
      {
        key: "assignees",
        label: "Assignees",
        type: "multi",
        options: membersList.map((m: any) => ({
          value: String(m.id),
          label: String(m.fullName || m.email || "Unknown"),
        })),
      },
      {
        key: "dateRange",
        label: "Date Range",
        type: "date_range",
        map: { start: "startDate", end: "endDate" },
      },
      {
        key: "amountRange",
        label: "Amount",
        type: "number_range",
        map: { min: "amountMin", max: "amountMax" },
      },
      { key: "hasAttachments", label: "Attachments", type: "boolean" },
      { key: "isRecurring", label: "Recurring", type: "boolean" },
    ],
    [typeOptions, statusOptionsPill, categoriesList, tagsList, accountsList, membersList]
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
  const [selectedTrx, setSelectedTrx] = useState<EnrichedItem | null>(null);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState("");
  const [allocAmount, setAllocAmount] = useState(0);
  const [createAccountOpen, setCreateAccountOpen] = useState(false);
  const invoiceSelectId = useId();
  const allocAmountId = useId();

  const applyParsedFilters = (p: Record<string, unknown>) => {
    if (!p || typeof p !== "object") return;
    setFilters({
      type: (p.type as string | null) ?? null,
      statuses: (p.statuses as string[] | null) ?? (p.status as string[] | null) ?? null,
      categories: (p.categories as string[] | null) ?? null,
      tags: (p.tags as string[] | null) ?? null,
      accounts: (p.accounts as string[] | null) ?? null,
      assignees: (p.assignees as string[] | null) ?? null,
      recurring: typeof p.isRecurring === "boolean" ? p.isRecurring : null,
      attachments: p.hasAttachments === undefined ? null : p.hasAttachments ? "include" : "exclude",
      amount_range:
        p.amountMin != null || p.amountMax != null
          ? [(p.amountMin as number) ?? 0, (p.amountMax as number) ?? 500_000]
          : null,
      start: p.startDate ? new Date(p.startDate as string).toISOString().slice(0, 10) : null,
      end: p.endDate ? new Date(p.endDate as string).toISOString().slice(0, 10) : null,
    });
  };

  // ✅ CORRECT: Use initialData from server, match query params with server
  const { data: invoicesResult } = trpc.invoices.list.useQuery(
    { limit: 50 },
    {
      initialData: initialInvoices,
      staleTime: 30_000, // Don't refetch for 30 seconds
    }
  );
  const invoices = invoicesResult?.items ?? [];

  const allocateMutation = trpc.transactions.allocate.useMutation({
    onSuccess: async () => {
      await invalidateTransactions();
      await utils.invoices.list.invalidate();
      setAllocateOpen(false);
    },
  });

  const bulkUpdate = trpc.transactions.bulkUpdate.useMutation({
    onSuccess: async () => {
      await invalidateTransactions();
      setSelected(new Set());
    },
  });
  // Targeted update for menu actions: optimistic single-row patch + minimal invalidations
  const menuUpdate = trpc.transactions.bulkUpdate.useMutation({
    async onMutate(variables) {
      type BulkUpdateVars = { transactionIds: string[]; updates: Record<string, unknown> };
      const vars = variables as BulkUpdateVars;
      const id = vars?.transactionIds?.[0];
      const updates = vars?.updates ?? {};
      if (!id) return;

      const currentKey = utils.transactions.enrichedList.getQueryKey(enrichedInput, "infinite");
      await queryClient.cancelQueries({ queryKey: currentKey });
      const prev = queryClient.getQueryData<{
        pages: Array<{ items: EnrichedItem[]; nextCursor?: string | null }>;
        pageParams: unknown[];
      }>(currentKey);

      if (prev) {
        const next = {
          ...prev,
          pages: prev.pages.map((p) => ({
            ...p,
            items: (p.items || []).map((r) =>
              r.transaction.id === id ? { ...r, transaction: { ...r.transaction, ...updates } } : r
            ),
          })),
        };
        queryClient.setQueryData(currentKey, next);
      }
      return { prev };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.prev) {
        const currentKey = utils.transactions.enrichedList.getQueryKey(enrichedInput, "infinite");
        queryClient.setQueryData(currentKey, ctx.prev);
      }
    },
    onSettled: async () => {
      await invalidateTransactions();
    },
  });
  const bulkDelete = trpc.transactions.bulkDelete.useMutation({
    async onMutate(variables) {
      type BulkDeleteVars = { transactionIds: string[] };
      const vars = variables as BulkDeleteVars;
      const ids = new Set(vars.transactionIds ?? []);

      // Optimistically remove from current list
      const currentKey = utils.transactions.enrichedList.getQueryKey(enrichedInput, "infinite");
      await queryClient.cancelQueries({ queryKey: currentKey });
      const previous = queryClient.getQueryData<{
        pages: Array<{ items: EnrichedItem[]; nextCursor?: string | null }>;
        pageParams: unknown[];
      }>(currentKey);

      if (previous) {
        const next = {
          ...previous,
          pages: previous.pages.map((p) => ({
            ...p,
            items: (p.items || []).filter((r) => !ids.has(r.transaction.id)),
          })),
        };
        queryClient.setQueryData(currentKey, next);
      }

      // Also update all cached filtered lists to avoid ghost rows when switching filters
      try {
        const entries = queryClient.getQueriesData<{
          pages: Array<{ items: EnrichedItem[]; nextCursor?: string | null }>;
          pageParams: unknown[];
        }>({ queryKey: ["transactions.enrichedList"] });

        for (const [key, data] of entries) {
          if (!(data && data.pages)) continue;
          const next = {
            ...data,
            pages: data.pages.map((p) => ({
              ...p,
              items: (p.items || []).filter((r) => !ids.has(r.transaction.id)),
            })),
          };
          queryClient.setQueryData(key, next);
        }
      } catch {
        // Ignore errors in cache update
      }
      return { previous };
    },
    onError: (_err, _vars, ctx) => {
      if (ctx?.previous) {
        const currentKey = utils.transactions.enrichedList.getQueryKey(enrichedInput, "infinite");
        queryClient.setQueryData(currentKey, ctx.previous);
      }
    },
    onSettled: async () => {
      await invalidateTransactions();
      setSelected(new Set());
    },
  });

  const rows = transactions;
  const shouldPollForEnrichment = useMemo(() => {
    if (rows.length === 0) return false;
    return !rows[0]?.transaction?.enrichmentCompleted;
  }, [rows]);

  // ✅ IMPROVED: Use Supabase real-time instead of polling
  useEffect(() => {
    if (!shouldPollForEnrichment) return;

    const supabase = createBrowserClient();
    const channel = supabase
      .channel("transactions-enrichment")
      .on(
        "postgres_changes",
        {
          event: "UPDATE",
          schema: "public",
          table: "transactions",
        },
        (payload) => {
          // Only refetch if enrichment completed
          if (
            payload.new &&
            (payload.new as { enrichment_completed?: boolean }).enrichment_completed
          ) {
            refetch();
          }
        }
      )
      .subscribe();

    // Fallback timeout in case real-time fails
    const timeout = setTimeout(() => {
      refetch();
    }, 60_000);

    return () => {
      supabase.removeChannel(channel);
      clearTimeout(timeout);
    };
  }, [shouldPollForEnrichment, refetch]);
  const [focusedIndex, setFocusedIndex] = useState<number>(0);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const lastAnchorIndex = useRef<number | null>(null);
  useEffect(() => {
    if (rows.length === 0) setFocusedIndex(0);
    else if (focusedIndex > rows.length - 1) setFocusedIndex(rows.length - 1);
  }, [rows.length, focusedIndex]);

  // Sticky columns offsets
  const { leftDate } = useStickyColumns();

  // Convert rows to TransactionRow type (needed before virtualization)
  const tableData: TransactionRow[] = useMemo(
    () =>
      rows.map((row) => ({
        transaction: row.transaction,
        client: row.client,
        category: row.category,
        assignedUser: row.assignedUser,
        tags: row.tags,
      })),
    [rows]
  );

  // ✅ Table virtualization for performance with large datasets
  const tableContainerRef = useRef<HTMLDivElement>(null);
  const rowVirtualizer = useVirtualizer({
    count: tableData.length,
    getScrollElement: () => tableContainerRef.current,
    estimateSize: () => 60, // Estimated row height in pixels
    overscan: 10, // Render 10 extra rows above and below viewport
    enabled: tableData.length > 50, // Only virtualize if more than 50 rows
  });

  const virtualRows = rowVirtualizer.getVirtualItems();
  const totalSize = rowVirtualizer.getTotalSize();
  const paddingTop = virtualRows.length > 0 ? virtualRows[0]?.start || 0 : 0;
  const paddingBottom =
    virtualRows.length > 0 ? totalSize - (virtualRows[virtualRows.length - 1]?.end || 0) : 0;

  const toggleRow = (id: string, checked: boolean) => {
    setRowSelection((prev) => {
      if (checked) {
        return { ...prev, [id]: true };
      }
      const next = { ...prev };
      delete next[id];
      return next;
    });
  };

  const exportSelected = () => {
    if (selected.size === 0) return;
    const selectedRows: EnrichedItem[] = Array.from(selected)
      .map((id) => byId.get(id))
      .filter((r): r is EnrichedItem => Boolean(r));
    const rows = selectedRows.map((row) => ({
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
      ...rows.map((r) =>
        headers.map((h) => JSON.stringify((r as Record<string, unknown>)[h] ?? "")).join(",")
      ),
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
    if (!(selectedTrx && selectedInvoiceId) || allocAmount <= 0) return;
    await allocateMutation.mutateAsync({
      transactionId: selectedTrx.transaction.id,
      invoiceId: selectedInvoiceId,
      amount: allocAmount,
    });
  };

  const { open: openParams } = useTransactionParams();
  const { toast } = useToast();

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
          await menuUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status },
          });
          toast({ description: "Transaction updated" });
        } catch {
          toast({ description: "Failed to update transaction", variant: "destructive" });
        }
      },
      onVoid: async (id) => {
        try {
          await menuUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status: "cancelled", excludeFromAnalytics: true },
          });
          toast({ description: "Transaction voided" });
        } catch {
          toast({ description: "Failed to void transaction", variant: "destructive" });
        }
      },
      onUnvoid: async (id) => {
        try {
          await menuUpdate.mutateAsync({
            transactionIds: [id],
            updates: { status: "pending", excludeFromAnalytics: false },
          });
          toast({ description: "Transaction unvoided" });
        } catch {
          toast({ description: "Failed to unvoid transaction", variant: "destructive" });
        }
      },
      onToggleExclude: async (id, exclude) => {
        try {
          await menuUpdate.mutateAsync({
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
      table.getSelectedRowModel().rows.map((row) => row.original.transaction.id)
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
        <div className="mb-4 flex items-center justify-between border-b bg-muted/40 px-4 py-3 sm:hidden">
          <div className="flex items-center gap-3">
            <span className="font-medium text-sm">Bulk edit</span>
            <div className="h-4 w-px bg-border" />
            <span className="text-muted-foreground text-sm">{selectedCount} selected</span>
          </div>
          <div className="flex items-center gap-2">
            <Button className="gap-1" onClick={_handleBulkExport} size="sm" variant="outline">
              <Download className="h-4 w-4" /> Export
            </Button>
            <BulkActions ids={Array.from(selected)} onComplete={() => setSelected(new Set())} />
            <Button className="gap-1" onClick={handleConfirmDelete} size="sm" variant="ghost">
              <Trash2 className="h-4 w-4" />
            </Button>
          </div>
        </div>
      )}

      {/* Analytics carousel */}
      <TransactionsAnalyticsCarousel
        initialSpending={initialSpending}
        initialStats={initialStats}
      />

      <div>
        <div className="mb-4 space-y-4">
          {/* Row 1: Right-aligned toolbar (search, filter icon, column visibility, export, add) */}
          <div className="sticky top-0 z-10 hidden grid-cols-[420px,1fr,auto] items-center gap-2 rounded bg-background/95 px-1 py-1 backdrop-blur supports-[backdrop-filter]:bg-background/80 sm:grid">
            {/* Left column: reserved slot for bulk actions (fixed width) */}
            <div className="min-w-0">
              {selectedCount > 0 ? (
                <div className="flex items-center gap-2">
                  <span className="text-muted-foreground text-sm">{selectedCount} selected</span>
                  <BulkActions
                    ids={Array.from(selected)}
                    onComplete={() => setSelected(new Set())}
                  />
                  <Button className="gap-1" onClick={_handleBulkExport} size="sm" variant="outline">
                    <Download className="h-4 w-4" /> Export
                  </Button>
                  <Button className="gap-1" onClick={handleConfirmDelete} size="sm" variant="ghost">
                    <Trash2 className="h-4 w-4" />
                  </Button>
                  <Button onClick={() => setRowSelection({})} size="sm" variant="ghost">
                    Clear
                  </Button>
                </div>
              ) : (
                <div className="pointer-events-none h-9 select-none opacity-0" />
              )}
            </div>

            {/* Middle column: spacer to keep layout stable */}
            <div className="min-w-0" />

            {/* Right column: filters and controls */}
            <div className="flex items-center justify-end gap-2">
              <SearchInline />
              <FilterDropdown
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
                        ? [n.amountMin ?? 0, n.amountMax ?? 500_000]
                        : null,
                    attachments: n.attachments ?? null,
                  });
                }}
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
                  attachments:
                    hasAttachments === "any"
                      ? undefined
                      : hasAttachments === "with"
                        ? "include"
                        : "exclude",
                }}
              />
              <TransactionsColumnVisibility columns={table.getAllColumns()} />
              {selectedCount === 0 && (
                <Button aria-label="Export" onClick={exportSelected} size="icon" variant="outline">
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
                      (next as any).amountRange?.amountMin != null ||
                      (next as any).amountRange?.amountMax != null
                        ? [
                            (next as any).amountRange?.amountMin ?? 0,
                            (next as any).amountRange?.amountMax ?? 500_000,
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
              />
            </div>
            <div className="flex items-center gap-2">
              {hasActiveFilters && (
                <Button onClick={clearAllFilters} size="sm" variant="ghost">
                  Reset
                </Button>
              )}
            </div>
          </div>

          {/* Using Notion-style pills + picker only; legacy sheet UI removed */}
        </div>

        {listError ? (
          <EmptyState
            action={{ label: "Clear filters", onClick: clearAllFilters }}
            description="There was a problem applying the current filters."
            title="Could not load results"
          />
        ) : rows.length ? (
          <div
            aria-label="Transactions table keyboard navigation"
            className="relative max-h-[calc(100vh-400px)] overflow-auto"
            onKeyDown={(e) => {
              if (!rows.length) return;
              if (e.key === "ArrowDown") {
                e.preventDefault();
                const newIndex = Math.min(focusedIndex + 1, rows.length - 1);
                setFocusedIndex(newIndex);
                // Scroll to focused row if virtualized
                if (tableData.length > 50) {
                  rowVirtualizer.scrollToIndex(newIndex, { align: "center" });
                }
              } else if (e.key === "ArrowUp") {
                e.preventDefault();
                const newIndex = Math.max(focusedIndex - 1, 0);
                setFocusedIndex(newIndex);
                if (tableData.length > 50) {
                  rowVirtualizer.scrollToIndex(newIndex, { align: "center" });
                }
              } else if (e.key === "Home") {
                e.preventDefault();
                setFocusedIndex(0);
                if (tableData.length > 50) {
                  rowVirtualizer.scrollToIndex(0);
                }
              } else if (e.key === "End") {
                e.preventDefault();
                setFocusedIndex(rows.length - 1);
                if (tableData.length > 50) {
                  rowVirtualizer.scrollToIndex(rows.length - 1);
                }
              } else if (e.key === " " && e.shiftKey) {
                e.preventDefault();
                const anchor = lastAnchorIndex.current ?? focusedIndex;
                const start = Math.min(anchor, focusedIndex);
                const end = Math.max(anchor, focusedIndex);
                const rangeIds = rows.slice(start, end + 1).map((r) => r.transaction.id);
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
            ref={tableContainerRef}
            role="application"
          >
            {isFetching && !isFetchingNextPage ? (
              <div className="absolute top-0 right-0 left-0 z-20 h-0.5 animate-pulse bg-primary/70" />
            ) : null}
            <Table className="min-w-[1200px]">
              <TableHeader className="sticky top-0 z-10 bg-background">
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => (
                      <TableHead
                        className={
                          header.id === "select"
                            ? "sticky left-0 z-10 w-10 bg-background"
                            : header.id === "date"
                              ? "sticky z-10 w-36 bg-background"
                              : header.id === "actions"
                                ? "w-[100px]"
                                : ""
                        }
                        data-col-id={header.id === "select" ? "select" : undefined}
                        key={header.id}
                        style={header.id === "date" ? { left: leftDate } : undefined}
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
                  <>
                    {paddingTop > 0 && (
                      <tr>
                        <td style={{ height: `${paddingTop}px` }} />
                      </tr>
                    )}
                    {(tableData.length > 50
                      ? virtualRows
                      : table.getRowModel().rows.map((_, idx) => ({ index: idx }))
                    ).map((virtualRow) => {
                      const row = table.getRowModel().rows[virtualRow.index];
                      if (!row) return null;
                      const idx = virtualRow.index;
                      return (
                        <TableRow
                          className={
                            "hover:bg-muted/50" + (idx === focusedIndex ? "bg-muted/40" : "")
                          }
                          data-state={row.getIsSelected() && "selected"}
                          key={row.id}
                          onClick={(e) => {
                            setFocusedIndex(idx);
                            lastAnchorIndex.current = idx;
                            if (selectedCount > 0) return;
                            const target = e.target as HTMLElement | null;
                            const interactive = target?.closest(
                              'button, a, input, select, textarea, [role="button"], [role="menuitem"], [role="option"], [data-row-click-exempt]'
                            );
                            if (!interactive) {
                              const id = row.original.transaction.id;
                              if (id) openParams({ transactionId: id });
                            }
                          }}
                        >
                          {row.getVisibleCells().map((cell) => (
                            <TableCell
                              className={
                                cell.column.id === "select"
                                  ? "sticky left-0 z-10 bg-background"
                                  : cell.column.id === "date"
                                    ? "sticky z-10 w-36 bg-background font-medium"
                                    : cell.column.id === "actions"
                                      ? "pr-2"
                                      : ""
                              }
                              key={cell.id}
                              style={cell.column.id === "date" ? { left: leftDate } : undefined}
                            >
                              {flexRender(cell.column.columnDef.cell, cell.getContext())}
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
                  </>
                ) : (
                  <TableRow>
                    <TableCell className="h-24 text-center" colSpan={table.getAllColumns().length}>
                      No results.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        ) : hasActiveFilters ? (
          <EmptyState
            action={{ label: "Clear filters", onClick: clearAllFilters }}
            description="Try another search, or adjust the filters."
            title="No results"
          />
        ) : accountsList.length === 0 ? (
          <EmptyState
            action={{ label: "Add account", onClick: () => setCreateAccountOpen(true) }}
            description="Connect or add an account to start importing transactions and unlock insights."
            title="No transactions"
          />
        ) : (
          <EmptyState
            action={{ label: "Record transaction", onClick: () => openParams() }}
            description="Record your first transaction to get started."
            title="No transactions"
          />
        )}
        {/* Infinite scroll sentinel */}
        <div ref={loadMoreRef} />
      </div>

      {/* No floating bottom bar; Reset lives on the pills row */}

      {/* Allocate Sheet */}
      <Sheet onOpenChange={setAllocateOpen} open={allocateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Allocate Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="text-muted-foreground text-sm">
              Transaction: {selectedTrx?.transaction?.transactionNumber} • Amount:{" "}
              {selectedTrx?.transaction?.currency}
              {Number(selectedTrx?.transaction?.amount || 0).toLocaleString()}
            </div>
            <div className="space-y-2">
              <label className="font-medium text-sm" htmlFor={invoiceSelectId}>
                Invoice
              </label>
              <select
                className="w-full rounded border px-3 py-2 text-sm"
                id={invoiceSelectId}
                onChange={(e) => setSelectedInvoiceId(e.target.value)}
                value={selectedInvoiceId}
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
              <label className="font-medium text-sm" htmlFor={allocAmountId}>
                Amount
              </label>
              <Input
                id={allocAmountId}
                onChange={(e) => setAllocAmount(Number.parseFloat(e.target.value) || 0)}
                step="0.01"
                type="number"
                value={allocAmount}
              />
            </div>
          </div>
          <SheetFooter>
            <Button
              disabled={allocateMutation.isPending}
              onClick={() => setAllocateOpen(false)}
              variant="outline"
            >
              Cancel
            </Button>
            <Button
              disabled={!selectedInvoiceId || allocAmount <= 0 || allocateMutation.isPending}
              onClick={submitAllocate}
            >
              {allocateMutation.isPending ? "Allocating…" : "Allocate"}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      {/* Create Account Dialog */}
      <CreateAccountDialog onOpenChange={setCreateAccountOpen} open={createAccountOpen} />
    </div>
  );
}

// Filter sheet helpers removed; AI search drives filters directly
