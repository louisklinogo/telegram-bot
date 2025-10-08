"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { formatDateUTC } from "@/lib/date";
import { Skeleton } from "@/components/ui/skeleton";
import type { MeasurementWithClient, OrderWithClient } from "@/lib/supabase-queries";

interface WidgetsProps {
  stats?: {
    totalRevenue: number;
    pendingPayments: number;
    activeOrders: number;
    recentMeasurements: number;
  };
  recentOrders?: OrderWithClient[];
  recentMeasurements?: MeasurementWithClient[];
  isLoading?: boolean;
}

export function Widgets({
  stats,
  recentOrders = [],
  recentMeasurements = [],
  isLoading = false,
}: WidgetsProps) {
  if (isLoading) {
    return (
      <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
        {Array.from({ length: 4 }).map((_, i) => (
          <Card key={i}>
            <CardHeader>
              <Skeleton className="h-4 w-24" />
            </CardHeader>
            <CardContent>
              <Skeleton className="h-8 w-32" />
            </CardContent>
          </Card>
        ))}
      </div>
    );
  }

  const statCards = [
    {
      title: "Total Revenue",
      value: stats?.totalRevenue || 0,
      format: (v: number) => `₵${v.toLocaleString()}`,
      trend: "+12% from last month",
      href: "/orders",
    },
    {
      title: "Pending Payments",
      value: stats?.pendingPayments || 0,
      format: (v: number) => `₵${v.toLocaleString()}`,
      trend: `${stats?.activeOrders || 0} invoices`,
      href: "/invoices",
    },
    {
      title: "Active Orders",
      value: stats?.activeOrders || 0,
      format: (v: number) => v.toString(),
      trend: "In progress",
      href: "/orders",
    },
    {
      title: "Measurements",
      value: stats?.recentMeasurements || 0,
      format: (v: number) => v.toString(),
      trend: "Last 30 days",
      href: "/measurements",
    },
  ];

  return (
    <div className="space-y-6">
      {/* Stat Cards */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {statCards.map((stat) => (
          <Link key={stat.title} href={stat.href}>
            <Card className="hover:shadow-md transition-all duration-200 cursor-pointer">
              <CardHeader className="pb-2">
                <CardTitle className="text-sm font-medium text-muted-foreground">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{stat.format(stat.value)}</div>
                <div className="flex items-center gap-1 text-xs text-muted-foreground mt-1">
                  <TrendingUp className="h-3 w-3" />
                  {stat.trend}
                </div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      {/* Recent Activity */}
      <div className="grid gap-6 md:grid-cols-2">
        {/* Recent Orders */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Orders</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Latest tailoring orders</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/orders" className="gap-2">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order, index) => (
                  <div key={order.id}>
                    <Link href={`/orders/${order.id}`}>
                      <div className="flex items-center justify-between hover:bg-accent/50 rounded-md p-2 -mx-2 transition-colors cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {order.client?.name || "Unknown Client"}
                          </p>
                          <p className="text-xs text-muted-foreground">{order.order_number}</p>
                        </div>
                        <div className="text-right space-y-1">
                          <p className="text-sm font-semibold">
                            ₵{order.total_price.toLocaleString()}
                          </p>
                          <Badge variant="secondary" className="text-xs">
                            {order.status}
                          </Badge>
                        </div>
                      </div>
                    </Link>
                    {index < recentOrders.slice(0, 5).length - 1 && <Separator className="my-2" />}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        {/* Recent Measurements */}
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <div>
              <CardTitle>Recent Measurements</CardTitle>
              <p className="text-sm text-muted-foreground mt-1">Latest client measurements</p>
            </div>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/measurements" className="gap-2">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentMeasurements.length === 0 ? (
              <div className="text-center py-8">
                <p className="text-sm text-muted-foreground">No recent measurements</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMeasurements.slice(0, 5).map((measurement, index) => (
                  <div key={measurement.id}>
                    <Link href={`/measurements`}>
                      <div className="flex items-center justify-between hover:bg-accent/50 rounded-md p-2 -mx-2 transition-colors cursor-pointer">
                        <div className="space-y-1">
                          <p className="text-sm font-medium">
                            {measurement.client?.name || "Unknown Client"}
                          </p>
                          <p className="text-xs text-muted-foreground">
                            {formatDateUTC(
                              ((measurement as any).taken_at ||
                                (measurement as any).created_at) as any,
                            )}
                          </p>
                        </div>
                        <Badge variant="secondary" className="text-xs">
                          {
                            ((measurement as any).garment_type ||
                              (measurement as any).garmentType) as any
                          }
                        </Badge>
                      </div>
                    </Link>
                    {index < recentMeasurements.slice(0, 5).length - 1 && (
                      <Separator className="my-2" />
                    )}
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
