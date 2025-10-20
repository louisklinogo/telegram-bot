"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

export function PendingOrdersCount() {
  const [data] = trpc.analytics.pendingOrdersCount.useSuspenseQuery();

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Pending Orders</div>
          <div className="text-sm text-muted-foreground">In progress</div>
        </div>
      </CardContent>
    </Card>
  );
}
