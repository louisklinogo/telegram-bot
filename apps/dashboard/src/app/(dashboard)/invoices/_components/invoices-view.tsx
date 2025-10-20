"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Download, Filter, MoreVertical, Plus, ReceiptText, Search, Send } from "lucide-react";
import { useMemo, useState } from "react";
import { toast } from "sonner";
import { useInvoiceParams } from "@/hooks/use-invoice-params";
import { InvoiceSheet } from "@/components/invoice-sheet";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
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
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { formatAmount } from "@/lib/format-currency";

const INVOICE_STATUSES = [
  "all",
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
] as const;
const STATUS_COLORS = {
  draft: "outline",
  sent: "default",
  partially_paid: "secondary",
  paid: "default",
  overdue: "destructive",
  cancelled: "secondary",
} as const;

type InvoiceRow = {
  id: string;
  invoice_number: string;
  amount: number;
  status: string;
  due_date?: string | Date | null;
  paid_at?: string | Date | null;
  paid_amount?: number;
  notes?: string | null;
  order?: { order_number?: string | null; client?: { name?: string | null } | null } | null;
};

type InvoicesViewProps = {
  initialInvoices?: any[];
};

export function InvoicesView({ initialInvoices = [] }: InvoicesViewProps) {
  const currency = useTeamCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof INVOICE_STATUSES)[number]>("all");
  const { openCreate } = useInvoiceParams();

  // ✅ CORRECT: Use tRPC hooks directly with initialData from server
  const {
    data: pages,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
  } = trpc.invoices.list.useInfiniteQuery(
    { limit: 50 },
    {
      getNextPageParam: (last) => (last as any)?.nextCursor ?? null,
      initialData:
        initialInvoices.length > 0
          ? {
              pages: [{ items: initialInvoices, nextCursor: null }],
              pageParams: [null],
            }
          : undefined,
    },
  );
  const data = useMemo(() => (pages?.pages || []).flatMap((p: any) => p?.items || []), [pages]);

  const invoices = useMemo<InvoiceRow[]>(
    () =>
      (data as any[]).map(({ invoice, order, client }) => ({
        id: invoice.id,
        invoice_number: invoice.invoiceNumber,
        amount: Number(invoice.amount || 0),
        status: String(invoice.status),
        due_date: (invoice as any).dueDate ?? null,
        paid_at: (invoice as any).paidAt ?? null,
        paid_amount: Number((invoice as any).paidAmount || 0),
        notes: invoice.notes ?? null,
        order: order
          ? {
              order_number: (order as any).orderNumber ?? null,
              client: client ? { name: client.name } : null,
            }
          : null,
      })),
    [data],
  );

  const filtered = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      inv.order?.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || inv.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const stats = {
    total: invoices.length,
    totalAmount: invoices.reduce((s, i) => s + (i.amount || 0), 0),
    paid: invoices.filter((i) => i.status === "paid").reduce((s, i) => s + (i.amount || 0), 0),
    outstanding: invoices
      .filter((i) => i.status !== "paid" && i.status !== "cancelled")
      .reduce((s, i) => s + (i.amount || 0), 0),
  };

  const handleSendWhatsApp = async (invoice: InvoiceRow) => {
    try {
      const base = process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001";
      const res = await fetch(`${base}/invoices/${invoice.id}/send-whatsapp`, { method: "POST" });
      const json = await res.json();
      if (res.ok) toast.success("Invoice enqueued to WhatsApp");
      else toast.error(json?.error || "Failed to enqueue");
    } catch (e: any) {
      toast.error(e?.message || "Failed to enqueue");
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {/* Stats Cards - Midday style at top, clickable to filter */}
      <div className="grid gap-4 sm:gap-6 md:grid-cols-4 pt-6">
        {/* Open Invoices (Pending + Sent) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("all");
            setSearchQuery("");
          }}
          className="hidden sm:block text-left"
        >
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2 flex flex-row items-center">
              <CardTitle className="font-medium text-2xl">
                {formatAmount({ currency, amount: stats.totalAmount })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div>Total Billed</div>
                <div className="text-sm text-muted-foreground">
                  {stats.total} {stats.total === 1 ? "invoice" : "invoices"}
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Overdue */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("overdue");
            setSearchQuery("");
          }}
          className="hidden sm:block text-left"
        >
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2 flex flex-row items-center">
              <CardTitle className="font-medium text-2xl text-orange-600">
                {formatAmount({ currency, amount: stats.outstanding })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div>Outstanding</div>
                <div className="text-sm text-muted-foreground">
                  {invoices.filter((i) => i.status === "overdue").length}{" "}
                  {invoices.filter((i) => i.status === "overdue").length === 1
                    ? "invoice"
                    : "invoices"}
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Paid */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("paid");
            setSearchQuery("");
          }}
          className="hidden sm:block text-left"
        >
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2 flex flex-row items-center">
              <CardTitle className="font-medium text-2xl text-green-600">
                {formatAmount({ currency, amount: stats.paid })}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div>Paid</div>
                <div className="text-sm text-muted-foreground">
                  {invoices.filter((i) => i.status === "paid").length}{" "}
                  {invoices.filter((i) => i.status === "paid").length === 1
                    ? "invoice"
                    : "invoices"}
                </div>
              </div>
            </CardContent>
          </Card>
        </button>

        {/* Open (Draft/Sent/Partially Paid) */}
        <button
          type="button"
          onClick={() => {
            setStatusFilter("draft");
            setSearchQuery("");
          }}
          className="hidden sm:block text-left"
        >
          <Card className="cursor-pointer transition-colors hover:bg-muted/50">
            <CardHeader className="pb-2 flex flex-row items-center">
              <CardTitle className="font-medium text-2xl">
                {
                  invoices.filter((i) => ["draft", "sent", "partially_paid"].includes(i.status))
                    .length
                }
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col gap-2">
                <div>Open</div>
                <div className="text-sm text-muted-foreground">Draft + Sent + Partial</div>
              </div>
            </CardContent>
          </Card>
        </button>
      </div>

      {/* Search & Actions Bar - Midday style */}
      <div className="flex items-center justify-between">
        <div className="relative hidden md:block">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            placeholder="Search invoices..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 w-[350px]"
          />
        </div>
        <div className="hidden sm:flex space-x-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button variant="outline" size="sm" className="gap-2">
            <Download className="h-4 w-4" /> Export
          </Button>
          <Button size="sm" className="gap-2" onClick={() => openCreate()}>
            <Plus className="h-4 w-4" /> New Invoice
          </Button>
        </div>
      </div>

      {/* Empty State - No invoices at all */}
      {invoices.length === 0 && !searchQuery && statusFilter === "all" && (
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center mt-40">
            <div className="text-center mb-6 space-y-2">
              <h2 className="font-medium text-lg">No invoices</h2>
              <p className="text-muted-foreground text-sm">
                You haven't created any invoices yet. <br />
                Go ahead and create your first one.
              </p>
            </div>
            <Button variant="outline" onClick={() => openCreate()}>
              Create invoice
            </Button>
          </div>
        </div>
      )}

      {/* No Results - Filters active but no matches */}
      {filtered.length === 0 && (searchQuery || statusFilter !== "all") && (
        <div className="flex items-center justify-center">
          <div className="flex flex-col items-center mt-40">
            <div className="text-center mb-6 space-y-2">
              <h2 className="font-medium text-lg">No results</h2>
              <p className="text-muted-foreground text-sm">Try another search, or adjusting the filters</p>
            </div>
            <Button
              variant="outline"
              onClick={() => {
                setSearchQuery("");
                setStatusFilter("all");
              }}
            >
              Clear filters
            </Button>
          </div>
        </div>
      )}

      {/* Table Card - Only show when we have data */}
      {(invoices.length > 0 || filtered.length > 0) && (
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>All Invoices</CardTitle>
                <p className="mt-1 text-sm text-muted-foreground">
                  Payment tracking and invoice history
                </p>
              </div>
              <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
                <TabsList>
                  <TabsTrigger value="all">All</TabsTrigger>
                  <TabsTrigger value="draft">Draft</TabsTrigger>
                  <TabsTrigger value="sent">Sent</TabsTrigger>
                  <TabsTrigger value="partially_paid">Partial</TabsTrigger>
                  <TabsTrigger value="paid">Paid</TabsTrigger>
                  <TabsTrigger value="overdue">Overdue</TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </CardHeader>
          <CardContent>
            {filtered.length > 0 && (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Invoice Number</TableHead>
                    <TableHead>Client</TableHead>
                    <TableHead>Order</TableHead>
                    <TableHead>Amount</TableHead>
                    <TableHead>Paid</TableHead>
                    <TableHead>Outstanding</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Due Date</TableHead>
                    <TableHead>Paid Date</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {filtered.map((invoice) => (
                    <TableRow key={invoice.id} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div className="space-y-1">
                          <p className="font-medium">{invoice.invoice_number}</p>
                          {invoice.notes && (
                            <p className="line-clamp-1 text-xs text-muted-foreground">
                              {invoice.notes}
                            </p>
                          )}
                        </div>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm">{invoice.order?.client?.name || "Unknown"}</span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.order?.order_number || "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="font-semibold">{formatAmount({ currency, amount: invoice.amount })}</span>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAmount({ currency, amount: invoice.paid_amount || 0 })}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatAmount({ currency, amount: Math.max(0, invoice.amount - (invoice.paid_amount || 0)) })}
                      </TableCell>
                      <TableCell>
                        <Badge
                          variant={(STATUS_COLORS as any)[invoice.status] || "secondary"}
                          className="capitalize"
                        >
                          {invoice.status}
                        </Badge>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.due_date
                            ? new Date(invoice.due_date as any).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <span className="text-sm text-muted-foreground">
                          {invoice.paid_at
                            ? new Date(invoice.paid_at as any).toLocaleDateString("en-US", {
                                month: "short",
                                day: "numeric",
                              })
                            : "-"}
                        </span>
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                            <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                              <MoreVertical className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Actions</DropdownMenuLabel>
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                handleSendWhatsApp(invoice);
                              }}
                            >
                              <Send className="mr-2 h-4 w-4" />
                              Send via WhatsApp
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-destructive">Delete</DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
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
      )}

      {/* Invoice Sheet */}
      <InvoiceSheet />
    </div>
  );
}
