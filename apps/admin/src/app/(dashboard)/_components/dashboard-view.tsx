"use client";

import { Filter, Plus, Search } from "lucide-react";
import { ChartArea } from "@/components/dashboard/chart-area";
import { Widgets } from "@/components/dashboard/widgets";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  calculateDashboardStats,
  generateOrdersData,
  generatePaymentsData,
  generateRevenueData,
} from "@/lib/chart-data";
import { trpc } from "@/lib/trpc/client";

type DashboardViewProps = {
  initialOrders: any[];
  initialInvoices: any[];
  initialMeasurements: any[];
};

export function DashboardView({ initialOrders, initialInvoices, initialMeasurements }: DashboardViewProps) {
  // ✅ CORRECT: Use initialData from server, no refetch on mount
  const [ordersResult] = trpc.orders.list.useSuspenseQuery(
    {},
    {
      initialData: { items: initialOrders, nextCursor: null },
    }
  );
  const [invoicesResult] = trpc.invoices.list.useSuspenseQuery(
    { limit: 50 },
    {
      initialData: { items: initialInvoices, nextCursor: null },
    }
  );
  const [measurementsResult] = trpc.measurements.list.useSuspenseQuery(
    { limit: 50 },
    {
      initialData: initialMeasurements,
    }
  );
  const ordersData = (ordersResult as any)?.items ?? ordersResult ?? [];
  const invoicesData = (invoicesResult as any)?.items ?? invoicesResult ?? [];
  const measurementsData = (measurementsResult as any)?.items ?? measurementsResult ?? [];

  const orders = ordersData.map(({ order, client }: any) => ({
    id: order.id,
    order_number: order.orderNumber,
    status: order.status,
    total_price: Number(order.totalPrice || 0),
    created_at: (order as any).createdAt,
    client: client ? { name: client.name } : null,
  }));

  const invoices = invoicesData.map(({ invoice, order, client }: any) => ({
    id: invoice.id,
    invoice_number: (invoice as any).invoiceNumber,
    amount: Number(invoice.amount || 0),
    status: String(invoice.status),
    created_at: (invoice as any).createdAt,
    order: order
      ? {
          order_number: (order as any).orderNumber ?? null,
          client: client ? { name: client.name } : null,
        }
      : null,
  }));

  const measurements = measurementsData.map(({ measurement, client }: any) => ({
    id: measurement.id,
    record_name: (measurement as any).recordName ?? null,
    garment_type: (measurement as any).garmentType ?? null,
    measurements: (measurement as any).measurements ?? {},
    taken_at: (measurement as any).takenAt ?? null,
    created_at: (measurement as any).createdAt ?? null,
    client: client ? { name: client.name } : null,
  }));

  const revenueData = generateRevenueData(orders as any);
  const ordersChart = generateOrdersData(orders as any);
  const paymentsData = generatePaymentsData(invoices as any);

  const stats = {
    ...calculateDashboardStats(orders as any, invoices as any),
    recentMeasurements: measurements.filter((m: any) => {
      const thirty = new Date();
      thirty.setDate(thirty.getDate() - 30);
      return new Date((m.created_at as any) || Date.now()) >= thirty;
    }).length,
  };

  return (
    <div className="flex flex-col gap-6 px-6">
      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, orders, invoices..."
            className="h-6 w-[350px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>

        <div className="ml-auto flex items-center gap-2">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      <ChartArea
        revenueData={revenueData}
        ordersData={ordersChart}
        paymentsData={paymentsData}
        isLoading={false}
      />

      <Widgets
        stats={stats}
        recentOrders={orders as any}
        recentMeasurements={measurements as any}
        isLoading={false}
      />
    </div>
  );
}
