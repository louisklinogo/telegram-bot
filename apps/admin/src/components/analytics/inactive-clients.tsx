"use client";

import { trpc } from "@/lib/trpc/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { useSuspenseQuery } from "@tanstack/react-query";

export function InactiveClients() {
  const [data] = trpc.analytics.inactiveClientsCount.useSuspenseQuery();

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>Inactive Clients</div>
          <div className="text-sm text-muted-foreground">
            No orders past 30 days
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
