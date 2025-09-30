"use client";

import { Filter, Plus } from "lucide-react";

import { OrdersTable } from "@/components/orders-table";
import { PageShell } from "@/components/page-shell";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { useOrders } from "@/hooks/use-supabase-data";

export default function OrdersPage() {
  const { data: orders, isLoading } = useOrders();

  const headerActions = (
    <Button size="sm" className="gap-2">
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
      <OrdersTable orders={orders || []} isLoading={isLoading} />
    </PageShell>
  );
}
