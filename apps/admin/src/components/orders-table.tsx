"use client";

import { createColumns } from "@/app/orders/columns";
import { DataTable } from "@/components/data-table";
import type { OrderWithClient } from "@/lib/supabase-queries";

interface OrdersTableProps {
  orders: OrderWithClient[];
  isLoading?: boolean;
  onEdit?: (order: OrderWithClient) => void;
  onDelete?: (order: OrderWithClient) => void;
}

export function OrdersTable({ orders, isLoading, onEdit, onDelete }: OrdersTableProps) {
  const columns = createColumns({ onEdit, onDelete });

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
