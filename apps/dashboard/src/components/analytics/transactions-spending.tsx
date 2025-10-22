"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format-currency";

export type SpendingRow = { slug: string; name: string; color?: string; total: number };

export function TransactionsSpending({ rows, currency, loading = false, onViewAll }: { rows: SpendingRow[]; currency: string; loading?: boolean; onViewAll?: () => void }) {
  const top = (rows || []).slice(0, 5);
  const total = top.reduce((s, r) => s + (Number(r.total) || 0), 0) || 0;
  return (
    <Card className="h-[200px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base">Spending</CardTitle>
          {onViewAll ? (
            <button onClick={onViewAll} className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-[34px] relative overflow-hidden">
        {loading ? (
          <ul className="space-y-2">
            {Array.from({ length: 6 }).map((_, i) => (
              <li key={i} className="flex items-center gap-3">
                <span className="h-2 w-2 rounded-sm bg-muted animate-pulse" />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between text-sm">
                    <span className="h-3 w-24 bg-muted animate-pulse rounded" />
                    <span className="h-3 w-16 bg-muted animate-pulse rounded" />
                  </div>
                </div>
              </li>
            ))}
          </ul>
        ) : top.length ? (
          <ul className="space-y-2">
            {top.map((row) => {
              const pct = total > 0 ? Math.max(0, Math.min(100, (Number(row.total) || 0) / total * 100)) : 0;
              return (
                <li key={row.slug}>
                  <div className="flex items-center gap-3">
                    <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: row.color || "#9b9b9b" }} />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center justify-between text-sm">
                        <span className="truncate">{row.name}</span>
                        <span className="text-muted-foreground text-xs">{formatAmount({ currency, amount: row.total })}</span>
                      </div>
                    </div>
                  </div>
                  <div className="mt-1 h-1.5 rounded bg-muted/50 overflow-hidden">
                    <div className="h-full rounded" style={{ width: `${pct}%`, backgroundColor: row.color || '#9b9b9b' }} />
                  </div>
                </li>
              );
            })}
          </ul>
        ) : (
          <div className="text-sm text-muted-foreground">No spending data</div>
        )}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-background" />
      </CardContent>
    </Card>
  );
}
