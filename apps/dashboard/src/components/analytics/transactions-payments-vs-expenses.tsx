"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { formatAmount } from "@/lib/format-currency";
import { useQueryState } from "nuqs";

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
          <ToggleGroup type="single" value={mode} onValueChange={(v) => v && setMode(v as Mode)} size="sm" className="gap-1">
            <ToggleGroupItem value="bar" aria-label="Bar">Bar</ToggleGroupItem>
            <ToggleGroupItem value="donut" aria-label="Donut">Donut</ToggleGroupItem>
          </ToggleGroup>
        </div>
      </CardHeader>
      <CardContent className="pb-[34px]">
        {loading ? (
          <div className="space-y-3">
            <div className="h-4 w-full bg-muted animate-pulse rounded" />
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground">
              <div className="h-3 w-28 bg-muted animate-pulse rounded" />
              <div className="h-3 w-20 bg-muted animate-pulse rounded" />
            </div>
          </div>
        ) : total <= 0 ? (
          <div className="text-sm text-muted-foreground">No data</div>
        ) : mode === "bar" ? (
          <div className="space-y-2">
            <div className="h-3 w-full rounded bg-muted/60 overflow-hidden">
              <div
                className="h-full float-left bg-emerald-500"
                style={{ width: `${pctIncome}%` }}
                role="button"
                aria-label="Filter payments"
                onClick={() => filterTo("payment")}
              />
              <div
                className="h-full float-left bg-red-500"
                style={{ width: `${pctExpenses}%` }}
                role="button"
                aria-label="Filter expenses"
                onClick={() => filterTo("expense")}
              />
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs">
              <button className="flex items-center justify-between text-left hover:text-foreground text-muted-foreground" onClick={() => filterTo("payment")}
                aria-label="Filter payments">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Payments</span>
                <span>
                  {formatAmount({ currency, amount: income })} ({pctIncome.toFixed(0)}%)
                </span>
              </button>
              <button className="flex items-center justify-between text-left hover:text-foreground text-muted-foreground" onClick={() => filterTo("expense")}
                aria-label="Filter expenses">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-red-500" />Expenses</span>
                <span>
                  {formatAmount({ currency, amount: expenses })} ({pctExpenses.toFixed(0)}%)
                </span>
              </button>
            </div>
          </div>
        ) : (
          <div className="flex items-center gap-4">
            <button
              className="relative shrink-0 h-20 w-20 rounded-full"
              style={{
                background: `conic-gradient(#10b981 ${pctIncome}%, #ef4444 0)`,
              }}
              aria-label="Toggle payments filter"
              onClick={() => filterTo("payment")}
            >
              <span className="absolute inset-2 rounded-full bg-background" />
              <span className="absolute inset-0 flex items-center justify-center text-xs font-medium">
                {Math.round(pctIncome)}%
              </span>
            </button>
            <div className="flex-1 grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
              <button className="flex items-center justify-between text-left hover:text-foreground text-muted-foreground" onClick={() => filterTo("payment")}
                aria-label="Filter payments">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-emerald-500" />Payments</span>
                <span>
                  {formatAmount({ currency, amount: income })} ({pctIncome.toFixed(0)}%)
                </span>
              </button>
              <button className="flex items-center justify-between text-left hover:text-foreground text-muted-foreground" onClick={() => filterTo("expense")}
                aria-label="Filter expenses">
                <span className="flex items-center gap-2"><span className="h-2 w-2 rounded-sm bg-red-500" />Expenses</span>
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
