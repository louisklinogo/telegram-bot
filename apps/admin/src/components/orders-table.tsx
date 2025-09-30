"use client";

import type { OrderWithClient } from "@/lib/supabase-queries";
import { DataTable } from "@/components/data-table";
import { createColumns } from "@/app/orders/columns";

interface OrdersTableProps {
  orders: OrderWithClient[];
  isLoading?: boolean;
}

export function OrdersTable({ orders, isLoading }: OrdersTableProps) {
  const columns = createColumns();

  return (
    <DataTable
      columns={columns}
      data={orders}
      isLoading={isLoading}
      searchKey="order_number"
      searchPlaceholder="Search orders by number..."
    />
  );
}
