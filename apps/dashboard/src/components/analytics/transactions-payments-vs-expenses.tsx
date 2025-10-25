"use client";

import { useQueryState } from "nuqs";
import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatAmount } from "@/lib/format-currency";

type Mode = "bar" | "donut";

export function TransactionsPaymentsVsExpenses({
  income,
  expenses,
  currency,
  loading = false,
}: {
  income: number;
  expenses: number;
  currency: string;
  loading?: boolean;
}) {
  const [mode, setMode] = useState<Mode>("bar");
  const [_type, setType] = useQueryState("type");

  const { total, pctIncome, pctExpenses } = useMemo(() => {
    const inc = Number(income || 0);
    const exp = Number(expenses || 0);
    const t = Math.max(0, inc + exp);
    const pctI = t > 0 ? (inc / t) * 100 : 0;
    const pctE = t > 0 ? (exp / t) * 100 : 0;
    return { total: t, pctIncome: pctI, pctExpenses: pctE };
  }, [income, expenses]);

  const filterTo = (kind: "payment" | "expense") => {
    try {
      // shallow route update, keep scroll position
      setType(kind, { shallow: true });
    } catch {}
  };

  return (
    <Card className="h-[200px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base">Payments vs Expenses</CardTitle>
          <ToggleGroup
            className="gap-1"
            onValueChange={(v) => v && setMode(v as Mode)}
            size="sm"
            type="single"
            value={mode}
          >
            <ToggleGroupItem aria-label="Bar" value="bar">
              Bar
            </ToggleGroupItem>
            <ToggleGroupItem aria-label="Donut" value="donut">
              Donut
            </ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pb-[34px]">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-full animate-pulse rounded bg-muted" />
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
            <div className="flex items-center justify-between text-muted-foreground text-xs">
              <div className="h-3 w-28 animate-pulse rounded bg-muted" />
              <div className="h-3 w-20 animate-pulse rounded bg-muted" />
            </div>
          </div>
        ) : total <= 0 ? (
          <div className="text-muted-foreground text-sm">No data</div>
        ) : mode === "bar" ? (
          <div className="space-y-2">
            <div className="h-3 w-full overflow-hidden rounded bg-muted/60">
              <div
                aria-label="Filter payments"
                className="float-left h-full bg-emerald-500"
                onClick={() => filterTo("payment")}
                role="button"
                style={{ width: `${pctIncome}%` }}
              />
              <div
                aria-label="Filter expenses"
                className="float-left h-full bg-red-500"
                onClick={() => filterTo("expense")}
                role="button"
                style={{ width: `${pctExpenses}%` }}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button
                aria-label="Filter payments"
                className="flex items-center justify-between text-left text-muted-foreground hover:text-foreground"
                onClick={() => filterTo("payment")}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                  Payments
                </span>
                <span>
                  {formatAmount({ currency, amount: income })} ({pctIncome.toFixed(0)}%)
                </span>
              </button>
              <button
                aria-label="Filter expenses"
                className="flex items-center justify-between text-left text-muted-foreground hover:text-foreground"
                onClick={() => filterTo("expense")}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-red-500" />
                  Expenses
                </span>
                <span>
                  {formatAmount({ currency, amount: expenses })} ({pctExpenses.toFixed(0)}%)
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              aria-label="Toggle payments filter"
              className="relative h-20 w-20 shrink-0 rounded-full"
              onClick={() => filterTo("payment")}
              style={{
                background: `conic-gradient(#10b981 ${pctIncome}%, #ef4444 0)`,
              }}
            >
              <span className="absolute inset-2 rounded-full bg-background" />
              <span className="absolute inset-0 flex items-center justify-center font-medium text-xs">
                {Math.round(pctIncome)}%
              </span>
            </button>
            <div className="grid flex-1 grid-cols-1 gap-3 text-xs sm:grid-cols-2">
              <button
                aria-label="Filter payments"
                className="flex items-center justify-between text-left text-muted-foreground hover:text-foreground"
                onClick={() => filterTo("payment")}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-emerald-500" />
                  Payments
                </span>
                <span>
                  {formatAmount({ currency, amount: income })} ({pctIncome.toFixed(0)}%)
                </span>
              </button>
              <button
                aria-label="Filter expenses"
                className="flex items-center justify-between text-left text-muted-foreground hover:text-foreground"
                onClick={() => filterTo("expense")}
              >
                <span className="flex items-center gap-2">
                  <span className="h-2 w-2 rounded-sm bg-red-500" />
                  Expenses
                </span>
                <span>
                  {formatAmount({ currency, amount: expenses })} ({pctExpenses.toFixed(0)}%)
                </span>
              </button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
}
