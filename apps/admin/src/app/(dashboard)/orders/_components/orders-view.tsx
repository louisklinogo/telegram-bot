"use client";

import { useSuspenseInfiniteQuery } from "@tanstack/react-query";
import { Download, Filter, MoreVertical, NotebookPen, Plus, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { DeleteOrderDialog } from "@/components/delete-order-dialog";
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
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
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
  in_progress: "default",
  completed: "default",
  cancelled: "destructive",
} as const;

type OrdersViewProps = {
  initialOrders?: any[];
};

export function OrdersView({ initialOrders = [] }: OrdersViewProps) {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<(typeof ORDER_STATUSES)[number]>("all");

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
      },
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
    [data],
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

  const stats = {
    total: orders.length,
    active: orders.filter((o) => o.status !== "completed" && o.status !== "cancelled").length,
    totalRevenue: orders.reduce((sum, o) => sum + (o.total_price || 0), 0),
    outstanding: orders.reduce((sum, o) => sum + (o.balance_amount || 0), 0),
  };

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

  return (
    <div className="flex flex-col gap-6 px-6">
      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search orders..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
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
          <Button size="sm" className="gap-2" onClick={handleNewOrder}>
            <Plus className="h-4 w-4" /> New Order
          </Button>
        </div>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.total}</div>
            <p className="mt-1 text-xs text-muted-foreground">All time</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Active Orders
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">{stats.active}</div>
            <p className="mt-1 text-xs text-muted-foreground">In progress</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Total Revenue
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{stats.totalRevenue.toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">All orders</p>
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">
              Outstanding Balance
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold">₵{stats.outstanding.toLocaleString()}</div>
            <p className="mt-1 text-xs text-muted-foreground">To be collected</p>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle>All Orders</CardTitle>
              <p className="mt-1 text-sm text-muted-foreground">
                Complete order history and tracking
              </p>
            </div>
            <Tabs value={statusFilter} onValueChange={(v) => setStatusFilter(v as any)}>
              <TabsList>
                <TabsTrigger value="all">All</TabsTrigger>
                <TabsTrigger value="generated">New</TabsTrigger>
                <TabsTrigger value="in_progress">In Progress</TabsTrigger>
                <TabsTrigger value="completed">Completed</TabsTrigger>
              </TabsList>
            </Tabs>
          </div>
        </CardHeader>
        <CardContent>
          {/* Suspense boundary guarantees hydration, so no loading state here */}
          {filteredOrders.length === 0 ? (
            <div className="py-12 text-center">
              <div className="mx-auto mb-4 w-fit rounded-full bg-muted p-6">
                <NotebookPen className="h-12 w-12 text-muted-foreground" />
              </div>
              <p className="text-sm text-muted-foreground">
                {searchQuery || statusFilter !== "all"
                  ? "No orders match your filters"
                  : "No orders found"}
              </p>
              <p className="mt-1 text-xs text-muted-foreground">
                Create your first order to get started
              </p>
            </div>
          ) : (
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
                  <TableHead className="w-[50px]"></TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {filteredOrders.map((order) => (
                  <TableRow
                    key={order.id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => handleEdit(order)}
                  >
                    <TableCell>
                      <div className="space-y-1">
                        <p className="font-medium">{order.order_number}</p>
                        {order.notes && (
                          <p className="line-clamp-1 text-xs text-muted-foreground">
                            {order.notes}
                          </p>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm">{order.client?.name || "Unknown"}</span>
                    </TableCell>
                    <TableCell>
                      <Badge
                        variant={(STATUS_COLORS as any)[order.status] ?? "secondary"}
                        className="capitalize"
                      >
                        {String(order.status).replace(/_/g, " ")}
                      </Badge>
                    </TableCell>
                    <TableCell>
                      <span className="font-semibold">
                        ₵{Number(order.total_price).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
                        ₵{Number(order.deposit_amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`text-sm font-medium ${Number(order.balance_amount) > 0 ? "text-orange-600" : "text-green-600"}`}
                      >
                        ₵{Number(order.balance_amount).toLocaleString()}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-muted-foreground">
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
                          <Button variant="ghost" size="sm" className="h-8 w-8 p-0">
                            <MoreVertical className="h-4 w-4" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <DropdownMenuLabel>Actions</DropdownMenuLabel>
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
                            onClick={(e) => {
                              e.stopPropagation();
                              handleDelete(order);
                            }}
                            className="text-destructive"
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

      <OrderSheet
        open={orderSheetOpen}
        onOpenChange={setOrderSheetOpen}
        order={selectedOrder as any}
      />
      <DeleteOrderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        order={selectedOrder as any}
      />
    </div>
  );
}
