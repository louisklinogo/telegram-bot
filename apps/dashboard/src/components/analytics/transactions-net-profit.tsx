"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format-currency";

export function TransactionsNetProfit({ amount, currency, loading = false }: { amount: number; currency: string; loading?: boolean }) {
  const isNegative = Number(amount || 0) < 0;
  return (
    <Card className={"h-[200px]"}>
      <CardHeader className="pb-3">
        {loading ? (
          <div className="h-8 w-32 bg-muted animate-pulse rounded" />
        ) : (
          <CardTitle className={"font-medium text-2xl " + (isNegative ? "text-red-600" : "text-emerald-600")}>
            {formatAmount({ currency, amount })}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="pb-[34px]">
        <div>Net Profit</div>
        <div className="text-sm text-muted-foreground">Income minus expenses</div>
      </CardContent>
    </Card>
  );
}
