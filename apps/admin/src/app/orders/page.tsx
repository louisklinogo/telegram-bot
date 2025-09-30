"use client";

import { Plus } from "lucide-react";
import { useState } from "react";
import { DeleteOrderDialog } from "@/components/delete-order-dialog";
import { OrderSheet } from "@/components/order-sheet";
import { OrdersTable } from "@/components/orders-table";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { useOrders } from "@/hooks/use-supabase-data";
import type { OrderWithClient } from "@/lib/supabase-queries";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();
  const [orderSheetOpen, setOrderSheetOpen] = useState(false);
  const [selectedOrder, setSelectedOrder] = useState<OrderWithClient | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);

  const handleEdit = (order: OrderWithClient) => {
    setSelectedOrder(order);
    setOrderSheetOpen(true);
  };

  const handleDelete = (order: OrderWithClient) => {
    setSelectedOrder(order);
    setDeleteDialogOpen(true);
  };

  const handleNewOrder = () => {
    setSelectedOrder(null);
    setOrderSheetOpen(true);
  };

  const handleSheetClose = (open: boolean) => {
    setOrderSheetOpen(open);
    if (!open) {
      setSelectedOrder(null);
    }
  };

  const headerActions = (
    <Button size="sm" className="gap-2" onClick={handleNewOrder}>
      <Plus className="h-4 w-4" /> New Order
    </Button>
  );

  return (
    <PageShell
      title="Orders"
      description="Monitor tailoring progress and keep every order on schedule."
      headerActions={headerActions}
      className="space-y-6"
    >
      <OrdersTable
        orders={orders || []}
        isLoading={isLoading}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />
      <OrderSheet open={orderSheetOpen} onOpenChange={handleSheetClose} order={selectedOrder} />
      <DeleteOrderDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        order={selectedOrder}
      />
    </PageShell>
  );
}
