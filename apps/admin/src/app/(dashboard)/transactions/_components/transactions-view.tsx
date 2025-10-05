"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseInfiniteQuery,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { Download, Filter, Plus, Search } from "lucide-react";
import { useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { trpc } from "@/lib/trpc/client";
import { TransactionSheet } from "@/components/transaction-sheet";
import { useTransactionParams } from "@/hooks/use-transaction-params";

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

  // ✅ CORRECT: Use initialData from server for infinite query
  const [trxPages, { fetchNextPage, hasNextPage, isFetchingNextPage }] = trpc.transactions.list.useSuspenseInfiniteQuery(
    { type: filterType === "all" ? undefined : (filterType as any), limit: 50 },
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

  const filtered = transactions.filter((t: any) => {
    const clientName = t.client?.name?.toLowerCase() || "";
    const desc = (t.trx.description || "").toLowerCase();
    return clientName.includes(search.toLowerCase()) || desc.includes(search.toLowerCase());
  });

  const openAllocate = (trx: any) => {
    setSelectedTrx(trx);
    setAllocAmount(Number(trx.trx.amount || 0));
    setSelectedInvoiceId("");
    setAllocateOpen(true);
  };

  const submitAllocate = async () => {
    if (!selectedTrx || !selectedInvoiceId || allocAmount <= 0) return;
    await allocateMutation.mutateAsync({
      transactionId: selectedTrx.trx.id,
      invoiceId: selectedInvoiceId,
      amount: allocAmount,
    });
  };

  const { open: openTransactionSheet } = useTransactionParams();

  return (
    <div className="flex flex-col gap-6 px-6">
      <TransactionSheet />

      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search transactions..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="h-6 w-[350px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => openTransactionSheet()}>
            <Plus className="h-4 w-4" /> Record Transaction
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Income
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">
              ₵{(stats as any)?.totalIncome?.toLocaleString?.() || 0}
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
              ₵{(stats as any)?.totalExpenses?.toLocaleString?.() || 0}
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
              ₵{(stats as any)?.netProfit?.toLocaleString?.() || 0}
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
              ₵{(stats as any)?.pendingPayments?.toLocaleString?.() || 0}
            </div>
            <p className="mt-1 text-xs text-muted-foreground">Awaiting collection</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>Transaction History</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                All financial movements and transactions
              </p>
            </div>
            <Tabs value={filterType} onValueChange={(v) => setFilterType(v as FilterType)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="payment">Payments</TabsTrigger>
                <TabsTrigger value="expense">Expenses</TabsTrigger>
                <TabsTrigger value="refund">Refunds</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {!filtered.length ? (
            <div className="space-y-3">
              {Array.from({ length: 5 }).map((_, i) => (
                <div key={i} className="flex items-center justify-between">
                  <div className="space-y-2">
                    <Skeleton className="h-4 w-48" />
                    <Skeleton className="h-3 w-32" />
                  </div>
                  <Skeleton className="h-4 w-24" />
                </div>
              ))}
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Date</TableHead>
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
                {filtered.map((row: any) => (
                  <TableRow key={row.trx.id} className="hover:bg-muted/50">
                    <TableCell className="font-medium">
                      {new Date(row.trx.transactionDate as any).toLocaleDateString("en-US", {
                        month: "short",
                        day: "numeric",
                        year: "numeric",
                      })}
                    </TableCell>
                    <TableCell>
                      <div className="space-y-1">
                        <p className="text-sm font-medium">{row.trx.description}</p>
                        {row.trx.paymentReference && (
                          <p className="text-xs text-muted-foreground">
                            Ref: {row.trx.paymentReference}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>{row.client?.name || "-"}</TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.trx.type === "payment"
                            ? "default"
                            : row.trx.type === "expense"
                              ? "secondary"
                              : "outline"
                        }
                      >
                        {row.trx.type}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.trx.category || "-"}
                    </TableCell>
                    <TableCell className="text-sm text-muted-foreground">
                      {row.trx.paymentMethod || "-"}
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={
                          row.trx.status === "completed"
                            ? "default"
                            : row.trx.status === "pending"
                              ? "secondary"
                              : "destructive"
                        }
                      >
                        {row.trx.status}
                      </Badge>
                    </TableCell>
                    <TableCell className="text-right font-semibold">
                      <span
                        className={
                          row.trx.type === "payment"
                            ? "text-green-600"
                            : row.trx.type === "expense"
                              ? "text-red-600"
                              : ""
                        }
                      >
                        {row.trx.type === "expense" && "-"}
                        {row.trx.currency}
                        {Number(row.trx.amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      {row.trx.type === "payment" && (
                        <Button size="sm" variant="outline" onClick={() => openAllocate(row)}>
                          Allocate
                        </Button>
                      )}
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
          {hasNextPage && (
            <div className="pt-4">
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

      <Sheet open={allocateOpen} onOpenChange={setAllocateOpen}>
        <SheetContent>
          <SheetHeader>
            <SheetTitle>Allocate Payment</SheetTitle>
          </SheetHeader>
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground">
              Transaction: {selectedTrx?.trx?.transactionNumber} • Amount:{" "}
              {selectedTrx?.trx?.currency}
              {Number(selectedTrx?.trx?.amount || 0).toLocaleString()}
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
                    {(r.invoice as any).invoiceNumber} · {r.client?.name || "-"} · ₵
                    {Number(r.invoice.amount || 0)}
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
