"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import {
  CheckCircle2,
  CircleSlash2,
  Download,
  MoreVertical,
  NotebookPen,
  PlayCircle,
  Plus,
  Search,
  SlidersHorizontal,
} from "lucide-react";
import { Suspense, useMemo, useState } from "react";
import { AverageOrderValue } from "@/components/analytics/average-order-value";
import { CompletedOrdersThisMonth } from "@/components/analytics/completed-orders-this-month";
import { HighestValueOrder } from "@/components/analytics/highest-value-order";
import { PendingOrdersCount } from "@/components/analytics/pending-orders-count";
import { DeleteOrderDialog } from "@/components/delete-order-dialog";
import { EmptyState } from "@/components/empty-state";
import { OrderSheet } from "@/components/order-sheet";
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
import { useUpdateOrder } from "@/hooks/use-order-mutations";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { formatAmount } from "@/lib/format-currency";
import { trpc } from "@/lib/trpc/client";

type OrderRow = {
  id: string;
  order_number: string;
  status: "generated" | "in_progress" | "completed" | "cancelled" | string;
  items?: any[];
  total_price: number;
  deposit_amount: number;
  balance_amount: number;
  notes?: string | null;
  due_date?: string | Date | null;
  created_at?: string | Date;
  client?: { id?: string; name?: string | null } | null;
};

const ORDER_STATUSES = ["all", "generated", "in_progress", "completed", "cancelled"] as const;

const STATUS_COLORS = {
  generated: "secondary",
  in_progress: "secondary",
  completed: "secondary",
  cancelled: "destructive",
} as const;

const STATUS_COLOR_CLASSES: Record<string, string> = {
  generated: "",
  in_progress: "bg-amber-100 text-amber-800 dark:bg-amber-900/30 dark:text-amber-300",
  completed: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-300",
  cancelled: "bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300",
};

type OrdersViewProps = {
  initialOrders?: any[];
};

export function OrdersView({ initialOrders = [] }: OrdersViewProps) {
  const currency = useTeamCurrency();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ORDER_STATUSES)[number]>("all");
  const updateOrder = useUpdateOrder();

  // ✅ CORRECT: Use initialData from server for infinite query
  const [pages, { fetchNextPage, hasNextPage, isFetchingNextPage }] =
    trpc.orders.list.useSuspenseInfiniteQuery(
      { limit: 50 },
      {
        getNextPageParam: (last) => last?.nextCursor ?? null,
        initialData:
          initialOrders.length > 0
            ? {
                pages: [{ items: initialOrders, nextCursor: null }],
                pageParams: [null],
              }
            : undefined,
      }
    );
  const data = useMemo(() => (pages?.pages || []).flatMap((p: any) => p?.items || []), [pages]);

  const orders: OrderRow[] = useMemo(
    () =>
      data.map(({ order, client }) => ({
        id: order.id,
        order_number: order.orderNumber,
        status: order.status as OrderRow["status"],
        total_price: Number(order.totalPrice || 0),
        deposit_amount: Number(order.depositAmount || 0),
        balance_amount: Number(order.balanceAmount || 0),
        notes: order.notes ?? null,
        due_date: (order as any).dueDate ?? null,
        created_at: (order as any).createdAt,
        client: client ? { id: client.id, name: client.name } : null,
      })),
    [data]
  );

  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderRow | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const filteredOrders = orders.filter((order) => {
    const matchesSearch =
      order.order_number?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      order.client?.name?.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || order.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  const handleEdit = (order: OrderRow) => {
    setSelectedOrder(order);
    setOrderSheetOpen(true);
  };

  const handleDelete = (order: OrderRow) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleNewOrder = () => {
    setSelectedOrder(null);
    setOrderSheetOpen(true);
  };

  const AnalyticsCardSkeleton = () => (
    <Card>
      <CardHeader className="pb-3">
        <div className="h-8 w-32 animate-pulse rounded bg-muted" />
      </CardHeader>
      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div className="h-4 w-24 animate-pulse rounded bg-muted" />
          <div className="h-4 w-40 animate-pulse rounded bg-muted" />
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="flex flex-col gap-6">
      {/* Analytics Cards Grid */}
      <div className="grid grid-cols-1 gap-4 pt-6 sm:grid-cols-2 sm:gap-6 lg:grid-cols-4">
        <Suspense fallback={<AnalyticsCardSkeleton />}>
          <HighestValueOrder />
        </Suspense>
        <Suspense fallback={<AnalyticsCardSkeleton />}>
          <CompletedOrdersThisMonth />
        </Suspense>
        <Suspense fallback={<AnalyticsCardSkeleton />}>
          <PendingOrdersCount />
        </Suspense>
        <Suspense fallback={<AnalyticsCardSkeleton />}>
          <AverageOrderValue />
        </Suspense>
      </div>

      <div className="flex flex-col gap-4">
        <div className="flex items-center justify-between gap-4">
          <div className="relative max-w-md flex-1">
            <Search className="-translate-y-1/2 absolute top-1/2 left-3 h-4 w-4 text-muted-foreground" />
            <Input
              className="pl-9"
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search orders..."
              value={searchQuery}
            />
          </div>

          <div className="flex items-center justify-end gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button size="icon" variant="ghost">
                  <SlidersHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuLabel>Filter by status</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {ORDER_STATUSES.map((status) => (
                  <DropdownMenuItem key={status} onClick={() => setStatusFilter(status)}>
                    <span className={statusFilter === status ? "font-semibold" : ""}>
                      {status === "all" ? "All Orders" : status.replace(/_/g, " ")}
                    </span>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
            <Button size="icon" variant="ghost">
              <Download className="h-4 w-4" />
            </Button>
            <Button onClick={handleNewOrder} size="icon">
              <Plus className="h-4 w-4" />
            </Button>
          </div>
        </div>
      </div>

      {filteredOrders.length === 0 ? (
        <EmptyState
          action={
            searchQuery || statusFilter !== "all"
              ? {
                  label: "Clear filters",
                  onClick: () => {
                    setSearchQuery("");
                    setStatusFilter("all");
                  },
                }
              : { label: "Create order", onClick: handleNewOrder }
          }
          description={
            searchQuery || statusFilter !== "all"
              ? "Try another search, or adjusting the filters"
              : "You haven't created any orders yet."
          }
          title={searchQuery || statusFilter !== "all" ? "No results" : "No orders"}
        />
      ) : (
        <Card>
          <CardHeader>
            <div>
              <CardTitle>All Orders</CardTitle>
              <p className="mt-1 text-muted-foreground text-sm">
                Complete order history and tracking
              </p>
            </div>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order Number</TableHead>
                  <TableHead>Client</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead>Total</TableHead>
                  <TableHead>Deposit</TableHead>
                  <TableHead>Balance</TableHead>
                  <TableHead>Due Date</TableHead>
                  <TableHead className="w-[50px]" />
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    className="cursor-pointer hover:bg-muted/50"
                    key={order.id}
                    onClick={() => handleEdit(order)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        {order.notes && (
                          <p className="line-clamp-1 text-muted-foreground text-xs">
                            {order.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.client?.name || "Unknown"}</span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Badge
                            className={`capitalize ${STATUS_COLOR_CLASSES[order.status] ?? ""} cursor-pointer`}
                            variant={(STATUS_COLORS as any)[order.status] ?? "secondary"}
                          >
                            {String(order.status).replace(/_/g, " ")}
                          </Badge>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="start" onClick={(e) => e.stopPropagation()}>
                          <DropdownMenuLabel>Set status</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          {order.status !== "generated" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateOrder.mutate({ id: order.id, data: { status: "generated" } })
                              }
                            >
                              Generated
                            </DropdownMenuItem>
                          )}
                          {order.status !== "in_progress" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateOrder.mutate({
                                  id: order.id,
                                  data: { status: "in_progress" },
                                })
                              }
                            >
                              In Progress
                            </DropdownMenuItem>
                          )}
                          {order.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={() =>
                                updateOrder.mutate({ id: order.id, data: { status: "completed" } })
                              }
                            >
                              Completed
                            </DropdownMenuItem>
                          )}
                          {order.status !== "cancelled" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={() =>
                                updateOrder.mutate({ id: order.id, data: { status: "cancelled" } })
                              }
                            >
                              Cancelled
                            </DropdownMenuItem>
                          )}
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        {formatAmount({ currency, amount: order.total_price })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {formatAmount({ currency, amount: order.deposit_amount })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`font-medium text-sm ${Number(order.balance_amount) > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        {formatAmount({ currency, amount: order.balance_amount })}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-muted-foreground text-sm">
                        {order.due_date
                          ? new Date(order.due_date as any).toLocaleDateString("en-US", {
                              month: "short",
                              day: "numeric",
                            })
                          : "-"}
                      </span>
                    </TableCell>
                    <TableCell>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <Button className="h-8 w-8 p-0" size="sm" variant="ghost">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
                          {/* Quick status actions */}
                          {order.status !== "in_progress" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrder.mutate({
                                  id: order.id,
                                  data: { status: "in_progress" },
                                });
                              }}
                            >
                              <PlayCircle className="mr-2 h-4 w-4" />
                              Mark as In Progress
                            </DropdownMenuItem>
                          )}
                          {order.status !== "completed" && (
                            <DropdownMenuItem
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrder.mutate({ id: order.id, data: { status: "completed" } });
                              }}
                            >
                              <CheckCircle2 className="mr-2 h-4 w-4" />
                              Mark as Completed
                            </DropdownMenuItem>
                          )}
                          {order.status !== "cancelled" && (
                            <DropdownMenuItem
                              className="text-destructive"
                              onClick={(e) => {
                                e.stopPropagation();
                                updateOrder.mutate({ id: order.id, data: { status: "cancelled" } });
                              }}
                            >
                              <CircleSlash2 className="mr-2 h-4 w-4" />
                              Cancel Order
                            </DropdownMenuItem>
                          )}
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={(e) => {
                              e.stopPropagation();
                              handleEdit(order);
                            }}
                          >
                            <NotebookPen className="mr-2 h-4 w-4" />
                            Edit
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            className="text-destructive"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(order);
                            }}
                          >
                            Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      )}
      {hasNextPage && filteredOrders.length > 0 && (
        <div className="pt-4">
          <Button
            disabled={!hasNextPage || isFetchingNextPage}
            onClick={() => fetchNextPage()}
            variant="ghost"
          >
            {isFetchingNextPage ? "Loading…" : "Load more"}
          </Button>
        </div>
      )}

      <OrderSheet
        onOpenChange={setOrderSheetOpen}
        open={orderSheetOpen}
        order={selectedOrder as any}
      />
      <DeleteOrderDialog
        onOpenChange={setDeleteDialogOpen}
        open={deleteDialogOpen}
        order={selectedOrder as any}
      />
    </div>
  );
}
