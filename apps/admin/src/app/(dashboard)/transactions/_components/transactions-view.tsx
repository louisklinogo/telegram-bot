"use client";

import { useMutation, useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  flexRender,
  getCoreRowModel,
  useReactTable,
  type RowSelectionState,
  type VisibilityState,
} from "@tanstack/react-table";
import {
  ChevronDown,
  Download,
  Filter,
  MoreHorizontal,
  Plus,
  Search,
  SlidersHorizontal,
  Trash2,
} from "lucide-react";
import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSeparator,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Skeleton } from "@/components/ui/skeleton";
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
import { TransactionDetailsSheet } from "@/components/transaction-details-sheet";
import { useTransactionParams } from "@/hooks/use-transaction-params";
import { EmptyState } from "@/components/empty-state";
import { CreateAccountDialog } from "@/components/create-account-dialog";
import { useToast } from "@/components/ui/use-toast";
// MultipleSelector retained elsewhere; not used here for filters UI
import { BulkActions } from "@/components/bulk-actions";
import { AddTransactions } from "@/components/add-transactions";
import { TransactionsColumnVisibility } from "@/components/transactions-column-visibility";
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
  const queryClient = useQueryClient();
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
  const [columnVisibility, setColumnVisibility] = useState<VisibilityState>({});
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

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
      startDate: startDate ? new Date(startDate + "T00:00:00Z") : undefined,
      endDate: endDate ? new Date(endDate + "T23:59:59Z") : undefined,
      hasAttachments: hasAttachments === "any" ? undefined : hasAttachments === "with",
      amountMin: amountMin ? Number(amountMin) : undefined,
      amountMax: amountMax ? Number(amountMax) : undefined,
      limit: 50,
    };
    
    // Remove undefined values to avoid issues
    Object.keys(input).forEach(key => {
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

  // Enriched list (regular query instead of infinite to debug)
  const { data: trxData } = trpc.transactions.enrichedList.useQuery(enrichedInput, {
    initialData:
      initialTransactions.length > 0 ? { items: initialTransactions, nextCursor: null } : undefined,
  });

  // Debug: Log the query parameters to see if filters are updating
  console.log("🔍 Filter Debug:", {
    enrichedInput,
    filterCounts: {
      statuses: statuses.length,
      categories: categories.length,
      tags: tags.length,
      accounts: accounts.length,
      assignees: assignees.length,
    }
  });
  const transactions = trxData?.items || [];
  const byId = useMemo(
    () => new Map<string, any>(transactions.map((r: any) => [r.transaction.id, r])),
    [transactions],
  );
  const { data: membersData } = trpc.transactions.members.useQuery(undefined, {
    staleTime: 30000,
  });
  const members = (membersData as any[]) ?? [];
  const currencyCode = useMemo(
    () => (transactions?.[0]?.transaction?.currency ?? "GHS") as string,
    [transactions],
  );
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
  // Infinite scroll removed for debugging

  const openAllocate = (row: any) => {
    setSelectedTrx(row);
    setAllocAmount(Number(row.transaction.amount || 0));
    setSelectedInvoiceId("");
    setAllocateOpen(true);
  };

  const toggleAll = (checked: boolean) => {
    if (!checked) {
      setRowSelection({});
    } else {
      const ids = rows.map((r: any) => r.transaction.id);
      const selection = ids.reduce((acc, id) => ({ ...acc, [id]: true }), {});
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

  const handleBulkCategory = async (slug: string) => {
    await runBulkUpdate({ categorySlug: slug });
  };

  const handleBulkStatus = async (status: "pending" | "completed" | "failed" | "cancelled") => {
    await runBulkUpdate({ status });
  };

  const handleBulkExclude = async (exclude: boolean) => {
    await runBulkUpdate({ excludeFromAnalytics: exclude });
  };

  const handleBulkAssign = async (assignedId: string | null) => {
    await runBulkUpdate({ assignedId });
  };

  const handleBulkExport = () => {
    exportSelected();
    toast({ description: `Exported ${selected.size} transactions` });
  };

  const handleConfirmDelete = async () => {
    const ids = Array.from(selected);
    if (!ids.length) return;
    try {
      await bulkDelete.mutateAsync({ transactionIds: ids });
      toast({ description: "Transactions deleted" });
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
      })),
    [rows],
  );

  // TanStack Table setup
  const columns = useMemo(() => {
    return createTransactionColumns({
      currencyCode,
      onToggleSelection: (id: string) => {
        // Let TanStack Table handle selection, we'll sync via useEffect
      },
      onViewDetails: (row) => {
        openParams({ transactionId: row.transaction.id });
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
          await bulkDelete.mutateAsync({ transactionIds: [id] });
          toast({ description: "Transaction deleted" });
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
              amountMin: amountMin ? parseInt(amountMin) : undefined,
              amountMax: amountMax ? parseInt(amountMax) : undefined,
              hasAttachments: hasAttachments === "with" ? true : hasAttachments === "without" ? false : undefined,
              isRecurring,
            }}
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
              if (p.hasAttachments !== undefined) setHasAttachments(p.hasAttachments === true ? "with" : p.hasAttachments === false ? "without" : "any");
              if (p.isRecurring !== undefined) setIsRecurring(p.isRecurring);
            }}
            onAskAI={async (q) => {
              const parsed = await aiParse.mutateAsync({ query: q });
              applyParsedFilters(parsed);
              return parsed as any;
            }}
          />
          
          {/* Table Controls Island */}
          <div className="flex items-center justify-end gap-2">
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
                  <div className="text-[#606060] text-sm">
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
                {table.getHeaderGroups().map((headerGroup) => (
                  <TableRow key={headerGroup.id}>
                    {headerGroup.headers.map((header) => {
                      const isSticky = header.id === "select" || header.id === "date";
                      return (
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
                      className={
                        "hover:bg-muted/50 " +
                        (idx === focusedIndex ? "ring-1 ring-primary/40" : "")
                      }
                      onClick={() => setFocusedIndex(idx)}
                    >
                      {row.getVisibleCells().map((cell) => {
                        const isSticky = cell.column.id === "select" || cell.column.id === "date";
                        return (
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
        {/* Infinite scroll removed for debugging */}
      </div>

      {/* Filters popover/sheet removed — Midday uses AI-first search without separate filter surface */}

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
                    {(r.invoice as any).invoiceNumber} · {r.client?.name || "-"} ·{" "}
                    {(r.invoice as any).currency ?? ""} {Number(r.invoice.amount || 0)}
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

      {/* Create Account Dialog */}
      <CreateAccountDialog open={createAccountOpen} onOpenChange={setCreateAccountOpen} />
    </div>
  );
}

// Filter sheet helpers removed; AI search drives filters directly
