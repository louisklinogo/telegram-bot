"use client";

import { useState } from "react";
import {
  Area,
  AreaChart,
  Bar,
  BarChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts";
import { Card } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface ChartDataPoint {
  date: string;
  value: number;
  label?: string;
}

interface ChartAreaProps {
  revenueData?: ChartDataPoint[];
  ordersData?: ChartDataPoint[];
  paymentsData?: ChartDataPoint[];
  isLoading?: boolean;
}

export function ChartArea({
  revenueData = [],
  ordersData = [],
  paymentsData = [],
  isLoading = false,
}: ChartAreaProps) {
  const [activeChart, setActiveChart] = useState<"revenue" | "orders" | "payments">("revenue");

  const chartConfig = {
    revenue: {
      data: revenueData,
      title: "Revenue",
      description: "Total revenue over time",
      color: "hsl(var(--chart-1))",
      type: "area" as const,
    },
    orders: {
      data: ordersData,
      title: "Orders",
      description: "Number of orders over time",
      color: "hsl(var(--chart-2))",
      type: "bar" as const,
    },
    payments: {
      data: paymentsData,
      title: "Payments",
      description: "Payment collection over time",
      color: "hsl(var(--chart-3))",
      type: "area" as const,
    },
  };

  const currentConfig = chartConfig[activeChart];

  if (isLoading) {
    return (
      <Card className="p-6">
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-10 w-64" />
          </div>
          <Skeleton className="h-[400px] w-full" />
        </div>
      </Card>
    );
  }

  return (
    <Card className="p-6">
      <div className="space-y-6">
        {/* Header */}
        <div className="flex items-center justify-between">
          <div>
            <h3 className="font-semibold text-lg">{currentConfig.title}</h3>
            <p className="text-muted-foreground text-sm">{currentConfig.description}</p>
          </div>

          <Tabs onValueChange={(v) => setActiveChart(v as any)} value={activeChart}>
            <TabsList>
              <TabsTrigger value="revenue">Revenue</TabsTrigger>
              <TabsTrigger value="orders">Orders</TabsTrigger>
              <TabsTrigger value="payments">Payments</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        {/* Chart */}
        <div className="h-[400px] w-full">
          {currentConfig.data.length === 0 ? (
            <div className="flex h-full items-center justify-center">
              <div className="text-center">
                <p className="text-muted-foreground text-sm">No data available</p>
                <p className="mt-1 text-muted-foreground text-xs">
                  Data will appear once you start recording {activeChart}
                </p>
              </div>
            </div>
          ) : (
            <ResponsiveContainer height="100%" width="100%">
              {currentConfig.type === "area" ? (
                <AreaChart data={currentConfig.data}>
                  <defs>
                    <linearGradient id="colorValue" x1="0" x2="0" y1="0" y2="1">
                      <stop offset="5%" stopColor={currentConfig.color} stopOpacity={0.3} />
                      <stop offset="95%" stopColor={currentConfig.color} stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis axisLine={false} className="text-xs" dataKey="date" tickLine={false} />
                  <YAxis axisLine={false} className="text-xs" tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs">
                                {payload[0].payload.date}
                              </p>
                              <p className="font-semibold text-sm">
                                {activeChart === "revenue"
                                  ? `₵${payload[0].value?.toLocaleString()}`
                                  : payload[0].value}
                              </p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Area
                    dataKey="value"
                    fill="url(#colorValue)"
                    fillOpacity={1}
                    stroke={currentConfig.color}
                    strokeWidth={2}
                    type="monotone"
                  />
                </AreaChart>
              ) : (
                <BarChart data={currentConfig.data}>
                  <CartesianGrid stroke="hsl(var(--border))" strokeDasharray="3 3" />
                  <XAxis axisLine={false} className="text-xs" dataKey="date" tickLine={false} />
                  <YAxis axisLine={false} className="text-xs" tickLine={false} />
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        return (
                          <div className="rounded-lg border bg-background p-3 shadow-lg">
                            <div className="space-y-1">
                              <p className="text-muted-foreground text-xs">
                                {payload[0].payload.date}
                              </p>
                              <p className="font-semibold text-sm">{payload[0].value} orders</p>
                            </div>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                  <Bar dataKey="value" fill={currentConfig.color} radius={[4, 4, 0, 0]} />
                </BarChart>
              )}
            </ResponsiveContainer>
          )}
        </div>
      </div>
    </Card>
  );
}
