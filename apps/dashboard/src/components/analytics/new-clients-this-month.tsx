"use client";

import { useSuspenseQuery } from "@tanstack/react-query";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { trpc } from "@/lib/trpc/client";

export function NewClientsThisMonth() {
  const [data] = trpc.analytics.newClientsThisMonth.useSuspenseQuery();

  return (
    <Card className="hidden sm:block">
      <CardHeader className="pb-3">
        <CardTitle className="font-medium text-2xl">{data}</CardTitle>
      </CardHeader>

      <CardContent className="pb-[34px]">
        <div className="flex flex-col gap-2">
          <div>New Clients</div>
          <div className="text-muted-foreground text-sm">Added this month</div>
        </div>
      </CardContent>
    </Card>
  );
}
