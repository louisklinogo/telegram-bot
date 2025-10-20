"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

export function MostActiveClient() {
  const [data] = trpc.analytics.mostActiveClient.useSuspenseQuery();

  if (!data) {
    return (
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="font-medium text-2xl">No Active Client</CardTitle>
        </CardHeader>

        <CardContent className="pb-[34px]">
          <div className="flex flex-col gap-2">
            <div>Most Active Client</div>
            <div className="text-sm text-muted-foreground">No client activity past 30 days</div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data.clientName}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Most Active Client</div>
          <div className="text-sm text-muted-foreground">
            {data.orderCount} order{data.orderCount !== 1 ? "s" : ""} past 30 days
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
