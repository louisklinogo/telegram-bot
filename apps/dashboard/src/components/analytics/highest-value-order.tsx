"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";
import { formatAmount } from "@/lib/format-currency";

export function HighestValueOrder() {
  const [data] = trpc.analytics.highestValueOrder.useSuspenseQuery();
  const { data: team } = trpc.teams.current.useQuery();

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-2xl">No Orders</CardTitle>
        </CardHeader>

        <CardContent className="pb-[34px]">
          <div className="flex flex-col gap-2">
            <div>Highest Order</div>
            <div className="text-sm text-muted-foreground">No orders found</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">
          {formatAmount({ currency: team?.baseCurrency || "GHS", amount: Number(data.totalPrice) })}
        </CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Highest Order</div>
          <div className="text-sm text-muted-foreground">
            {data.orderNumber} from {data.clientName || "Unknown"}
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
