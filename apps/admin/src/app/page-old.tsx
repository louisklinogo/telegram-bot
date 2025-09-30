"use client";

import { ArrowUpRight, Download, Filter, Plus, Search, TrendingUp } from "lucide-react";

import { AnimatedNumber } from "@/components/animated-number";
import { PageShell } from "@/components/page-shell";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { useDashboardStats, useMeasurements, useOrders } from "@/hooks/use-supabase-data";

export default function DashboardPage() {
  const { data: stats, isLoading: statsLoading } = useDashboardStats();
  const { data: orders, isLoading: ordersLoading } = useOrders();
  const { data: measurements, isLoading: measurementsLoading } = useMeasurements();

  const overviewMetrics = stats
    ? [
        {
          label: "Active Orders",
          value: stats.activeOrders,
          displayValue: stats.activeOrders.toString(),
          change: `${stats.activeOrders} in progress`,
          prefix: "",
          suffix: "",
        },
        {
          label: "Outstanding Invoices",
          value: stats.outstandingInvoicesAmount,
          displayValue: `₵${stats.outstandingInvoicesAmount.toLocaleString()}`,
          change: `${stats.outstandingInvoicesCount} awaiting payment`,
          prefix: "₵",
          suffix: "",
        },
        {
          label: "Recent Measurements",
          value: stats.recentMeasurements,
          displayValue: stats.recentMeasurements.toString(),
          change: "Last 7 days",
          prefix: "",
          suffix: "",
        },
        {
          label: "Files Received",
          value: stats.recentFiles,
          displayValue: stats.recentFiles.toString(),
          change: "Last 7 days",
          prefix: "",
          suffix: "",
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
              <Card key={`stat-${i}`} className="border-muted hover:shadow-md transition-shadow">
                <CardHeader className="pb-3">
                  <Skeleton className="h-4 w-32" />
                </CardHeader>
                <CardContent className="space-y-3">
                  <Skeleton className="h-9 w-20" />
                  <div className="flex items-center gap-1">
                    <Skeleton className="h-4 w-4 rounded-full" />
                    <Skeleton className="h-4 w-28" />
                  </div>
                </CardContent>
              </Card>
            ))
          : overviewMetrics.map((metric) => (
              <Card
                key={metric.label}
                className="border-muted hover:shadow-md transition-all duration-200 hover:-translate-y-1"
              >
                <CardHeader className="pb-3">
                  <CardTitle className="text-xs font-medium text-muted-foreground uppercase tracking-wide">
                    {metric.label}
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-3">
                  <AnimatedNumber
                    value={metric.value}
                    prefix={metric.prefix}
                    suffix={metric.suffix}
                    className="text-3xl font-bold tracking-tight"
                  />
                  <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                    <TrendingUp className="h-3.5 w-3.5 text-emerald-600" />
                    <span>{metric.change}</span>
                  </div>
                </CardContent>
              </Card>
            ))}
      </section>

      <section className="grid gap-6 xl:grid-cols-2">
        <Card className="border-muted hover:shadow-sm transition-shadow">
          <CardHeader className="flex flex-row items-center justify-between gap-2">
            <div>
              <CardTitle className="text-lg font-semibold">Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground">
                Track progress on active tailoring work.
              </p>
            </div>
            <Button variant="outline" size="sm" className="gap-2 shrink-0">
              <Download className="h-4 w-4" /> Export
            </Button>
          </CardHeader>
          <CardContent className="space-y-4">
            {ordersLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`order-${i}`} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-24" />
                    </div>
                    <div className="space-y-2 text-right">
                      <Skeleton className="h-4 w-20" />
                      <Skeleton className="h-3 w-16" />
                    </div>
                  </div>
                  {i !== 2 && <Separator />}
                </div>
              ))
            ) : recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent orders</p>
              </div>
            ) : (
              recentOrders.map((order, index) => (
                <div key={order.orderId} className="space-y-3">
                  <div className="flex items-center justify-between hover:bg-accent/50 rounded-md p-2 -mx-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium leading-none">{order.client}</p>
                      <p className="text-xs text-muted-foreground mt-1">{order.orderId}</p>
                    </div>
                    <div className="text-right">
                      <p className="text-sm font-semibold tracking-tight">{order.total}</p>
                      <Badge variant="secondary" className="text-xs mt-1">
                        {order.status}
                      </Badge>
                    </div>
                  </div>
                  {index !== recentOrders.length - 1 && <Separator />}
                </div>
              ))
            )}
          </CardContent>
        </Card>

        <Card className="border-muted hover:shadow-sm transition-shadow">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">Measurement Schedule</CardTitle>
            <p className="text-sm text-muted-foreground">
              Upcoming fittings and measurement sessions.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {measurementsLoading ? (
              Array.from({ length: 3 }).map((_, i) => (
                <div key={`measurement-${i}`} className="space-y-3">
                  <div className="flex items-center justify-between">
                    <div className="space-y-2 flex-1">
                      <Skeleton className="h-4 w-32" />
                      <Skeleton className="h-3 w-28" />
                    </div>
                    <Skeleton className="h-5 w-20" />
                  </div>
                  {i !== 2 && <Separator />}
                </div>
              ))
            ) : upcomingMeasurements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent measurements</p>
              </div>
            ) : (
              upcomingMeasurements.map((booking, index) => (
                <div key={`${booking.client}-${index}`} className="space-y-3">
                  <div className="flex items-center justify-between hover:bg-accent/50 rounded-md p-2 -mx-2 transition-colors">
                    <div>
                      <p className="text-sm font-medium leading-none">{booking.client}</p>
                      <p className="text-xs text-muted-foreground mt-1">{booking.date}</p>
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
