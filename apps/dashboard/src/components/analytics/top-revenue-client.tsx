"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatAmount } from "@/lib/format-currency";

export function TopRevenueClient() {
  const [data] = trpc.analytics.topRevenueClient.useSuspenseQuery();
  const { data: team } = trpc.teams.current.useQuery();

  if (!data) {
    return (
      <Card className="hidden sm:block">
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-2xl">No Revenue Client</CardTitle>
        </CardHeader>

        <CardContent className="pb-[34px]">
          <div className="flex flex-col gap-2">
            <div>Top Revenue Client</div>
            <div className="text-sm text-muted-foreground">No revenue generated past 30 days</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data.clientName}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Top Revenue Client</div>
          <div className="text-sm text-muted-foreground">
            {formatAmount({ currency: team?.baseCurrency || "GHS", amount: Number(data.totalRevenue), maximumFractionDigits: 2, minimumFractionDigits: 2 })} from {data.orderCount} order
            {data.orderCount !== 1 ? "s" : ""} past 30 days
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
