"use client";

import { ArrowUpRight, Download, Filter, Plus, Search } from "lucide-react";

import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import {
  useDashboardStats,
  useMeasurements,
  useOrders,
} from "@/hooks/use-supabase-data";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: measurements, isLoading: measurementsLoading } = useMeasurements();

  const overviewMetrics = stats
    ? [
        {
          label: "Active Orders",
          value: stats.activeOrders.toString(),
          change: `${stats.activeOrders} in progress`,
        },
        {
          label: "Outstanding Invoices",
          value: `₵${stats.outstandingInvoicesAmount.toLocaleString()}`,
          change: `${stats.outstandingInvoicesCount} awaiting payment`,
        },
        {
          label: "Recent Measurements",
          value: stats.recentMeasurements.toString(),
          change: "Last 7 days",
        },
        {
          label: "Files Received",
          value: stats.recentFiles.toString(),
          change: "Last 7 days",
        },
      ]
    : [];

  const recentOrders = (orders || []).slice(0, 3).map((order) => ({
    client: order.client?.name || "Unknown",
    orderId: order.order_number,
    total: `₵${order.total_price.toLocaleString()}`,
    status: order.status,
  }));

  const upcomingMeasurements = (measurements || []).slice(0, 3).map((m) => ({
    client: m.client?.name || "Unknown",
    date: new Date(m.taken_at || m.created_at).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      hour: "numeric",
      minute: "2-digit",
    }),
    notes: m.record_name,
  }));

  const headerActions = (
    <div className="flex items-center gap-2">
      <div className="hidden items-center gap-2 rounded-md border px-3 py-1.5 text-sm md:flex">
        <Search className="h-4 w-4 text-muted-foreground" />
        <Input
          placeholder="Search clients, orders, invoices..."
          className="h-6 border-none bg-transparent p-0 text-sm focus-visible:ring-0"
        />
      </div>
      <Button variant="outline" size="sm" className="gap-2">
        <Filter className="h-4 w-4" /> Filters
      </Button>
      <Button size="sm" className="gap-2">
        <Plus className="h-4 w-4" /> New Entry
      </Button>
    </div>
  );

  return (
    <PageShell
      title="Dashboard"
      description="Real-time visibility into orders, invoices, and measurement activity."
      headerActions={headerActions}
      className="flex flex-col gap-6"
    >
      <section className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {statsLoading
          ? Array.from({ length: 4 }).map((_, i) => (
              <Card key={`stat-${i}`} className="border-muted">
                <CardHeader className="space-y-1">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <Skeleton className="h-8 w-16" />
                  <Skeleton className="h-5 w-24" />
                </CardContent>
              </Card>
            ))
          : overviewMetrics.map((metric) => (
              <Card key={metric.label} className="border-muted">
                <CardHeader className="space-y-1">
                  <CardTitle className="text-sm font-medium text-muted-foreground">
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="flex items-end justify-between">
                  <span className="text-2xl font-semibold tracking-tight">{metric.value}</span>
                  <Badge variant="outline" className="gap-1 text-xs">
                    <ArrowUpRight className="h-3 w-3" />
                    {metric.change}
                  </Badge>
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-muted">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-base font-semibold">Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress on active tailoring work.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2">
              <Download className="h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`order-${i}`} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-24" />
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent orders</p>
            ) : (
              recentOrders.map((order, index) => (
                <div key={order.orderId} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium leading-none">{order.client}</p>
                      <p className="text-xs text-muted-foreground">{order.orderId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tracking-tight">{order.total}</p>
                      <p className="text-xs text-muted-foreground">{order.status}</p>
                    </div>
                  </div>
                  {index !== recentOrders.length - 1 && <Separator />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-muted">
          <CardHeader>
            <CardTitle className="text-base font-semibold">Measurement Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upcoming fittings and measurement sessions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {measurementsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`measurement-${i}`} className="space-y-2">
                  <Skeleton className="h-4 w-full" />
                  <Skeleton className="h-3 w-32" />
                </div>
              ))
            ) : upcomingMeasurements.length === 0 ? (
              <p className="text-sm text-muted-foreground">No recent measurements</p>
            ) : (
              upcomingMeasurements.map((booking, index) => (
                <div key={`${booking.client}-${index}`} className="space-y-2">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium leading-none">{booking.client}</p>
                      <p className="text-xs text-muted-foreground">{booking.date}</p>
                    </div>
                    <Badge variant="secondary" className="text-xs">
                      {booking.notes}
                    </Badge>
                  </div>
                  {index !== upcomingMeasurements.length - 1 && <Separator />}
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </section>
    </PageShell>
  );
}
