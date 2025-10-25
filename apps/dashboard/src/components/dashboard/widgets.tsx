"use client";

import { ArrowRight, TrendingUp } from "lucide-react";
import Link from "next/link";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDateUTC } from "@/lib/date";
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
          <Link href={stat.href} key={stat.title}>
            <Card className="cursor-pointer transition-all duration-200 hover:shadow-md">
              <CardHeader className="pb-2">
                <CardTitle className="font-medium text-muted-foreground text-sm">
                  {stat.title}
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="font-bold text-2xl">{stat.format(stat.value)}</div>
                <div className="mt-1 flex items-center gap-1 text-muted-foreground text-xs">
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
              <p className="mt-1 text-muted-foreground text-sm">Latest tailoring orders</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link className="gap-2" href="/orders">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentOrders.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No recent orders</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentOrders.slice(0, 5).map((order, index) => (
                  <div key={order.id}>
                    <Link href={`/orders/${order.id}`}>
                      <div className="-mx-2 flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-accent/50">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {order.client?.name || "Unknown Client"}
                          </p>
                          <p className="text-muted-foreground text-xs">{order.order_number}</p>
                        </div>
                        <div className="space-y-1 text-right">
                          <p className="font-semibold text-sm">
                            ₵{order.total_price.toLocaleString()}
                          </p>
                          <Badge className="text-xs" variant="secondary">
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
              <p className="mt-1 text-muted-foreground text-sm">Latest client measurements</p>
            </div>
            <Button asChild size="sm" variant="ghost">
              <Link className="gap-2" href="/measurements">
                View all <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {recentMeasurements.length === 0 ? (
              <div className="py-8 text-center">
                <p className="text-muted-foreground text-sm">No recent measurements</p>
              </div>
            ) : (
              <div className="space-y-4">
                {recentMeasurements.slice(0, 5).map((measurement, index) => (
                  <div key={measurement.id}>
                    <Link href={"/measurements"}>
                      <div className="-mx-2 flex cursor-pointer items-center justify-between rounded-md p-2 transition-colors hover:bg-accent/50">
                        <div className="space-y-1">
                          <p className="font-medium text-sm">
                            {measurement.client?.name || "Unknown Client"}
                          </p>
                          <p className="text-muted-foreground text-xs">
                            {formatDateUTC(
                              ((measurement as any).taken_at ||
                                (measurement as any).created_at) as any
                            )}
                          </p>
                        </div>
                        <Badge className="text-xs" variant="secondary">
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
