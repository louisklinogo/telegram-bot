"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format-currency";

export function TransactionsTotalExpenses({
  amount,
  currency,
  subtitle,
  loading = false,
}: {
  amount: number;
  currency: string;
  subtitle?: string;
  loading?: boolean;
}) {
  return (
    <Card className="h-[200px]">
      <CardHeader className="pb-3">
        {loading ? (
          <div className="h-8 w-32 animate-pulse rounded bg-muted" />
        ) : (
          <CardTitle className="font-medium text-2xl text-red-600">
            {formatAmount({ currency, amount })}
          </CardTitle>
        )}
      </CardHeader>
      <CardContent className="pb-[34px]">
        <div>Total Expenses</div>
        <div className="text-muted-foreground text-sm">{subtitle || "Selected period"}</div>
      </CardContent>
    </Card>
  );
}
