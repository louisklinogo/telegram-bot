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
    <div className="flex items-center gap-2">
      <Input placeholder="Search orders..." className="h-9 w-64" />
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filter
      </Button>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> New Order
      </Button>
    </div>
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
