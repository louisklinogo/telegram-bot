"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format-currency";
import { trpc } from "@/lib/trpc/client";

export function AverageOrderValue() {
  const [data] = trpc.analytics.averageOrderValue.useSuspenseQuery();
  const { data: team } = trpc.teams.current.useQuery();

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">
          {formatAmount({ currency: team?.baseCurrency || "GHS", amount: Number(data) })}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Average Order Value</div>
          <div className="text-muted-foreground text-sm">Per order</div>
        </div>
      </CardContent>
    </Card>
  );
}
