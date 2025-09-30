"use client";

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
import { useInvoices, useMeasurements, useOrders } from "@/hooks/use-supabase-data";
import { Filter, Plus, Search } from "lucide-react";

export default function DashboardPage() {
  const { data: orders = [], isLoading: ordersLoading } = useOrders();
  const { data: invoices = [], isLoading: invoicesLoading } = useInvoices();
  const { data: measurements = [], isLoading: measurementsLoading } = useMeasurements();

  const isLoading = ordersLoading || invoicesLoading || measurementsLoading;

  // Generate chart data
  const revenueData = !isLoading ? generateRevenueData(orders) : [];
  const ordersData = !isLoading ? generateOrdersData(orders) : [];
  const paymentsData = !isLoading ? generatePaymentsData(invoices) : [];

  // Calculate stats
  const stats = !isLoading
    ? {
        ...calculateDashboardStats(orders, invoices),
        recentMeasurements: measurements.filter((m) => {
          const thirtyDaysAgo = new Date();
          thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
          return new Date(m.created_at) >= thirtyDaysAgo;
        }).length,
      }
    : undefined;

  return (
    <div className="flex flex-col gap-6 px-6">
      {/* Header with Search and Actions */}
      <div className="flex justify-between py-6">
        <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
          <Search className="h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search clients, orders, invoices..."
            className="h-6 w-[350px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
          />
        </div>
        
        <div className="flex items-center gap-2 ml-auto">
          <Button variant="outline" size="sm" className="gap-2">
            <Filter className="h-4 w-4" /> Filters
          </Button>
          <Button size="sm" className="gap-2">
            <Plus className="h-4 w-4" /> New Entry
          </Button>
        </div>
      </div>

      {/* Chart Area */}
      <ChartArea
        revenueData={revenueData}
        ordersData={ordersData}
        paymentsData={paymentsData}
        isLoading={isLoading}
      />

      {/* Widgets Grid */}
      <Widgets
        stats={stats}
        recentOrders={orders}
        recentMeasurements={measurements}
        isLoading={isLoading}
      />
    </div>
  );
}
