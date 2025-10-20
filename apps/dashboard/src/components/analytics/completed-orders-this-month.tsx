"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

export function CompletedOrdersThisMonth() {
  const [data] = trpc.analytics.completedOrdersThisMonth.useSuspenseQuery();

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Completed Orders</div>
          <div className="text-sm text-muted-foreground">Last 30 days</div>
        </div>
      </CardContent>
    </Card>
  );
}
