"use client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { formatAmount } from "@/lib/format-currency";

export type RecentRow = { id: string; description?: string | null; clientName?: string | null; type: "payment" | "expense" | string; amount: number; date?: string | Date | null };

export function TransactionsRecent({ items, currency, loading = false, onViewAll }: { items: RecentRow[]; currency: string; loading?: boolean; onViewAll?: () => void }) {
  return (
    <Card className="h-[200px]">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <CardTitle className="font-medium text-base">Recent Transactions</CardTitle>
          {onViewAll ? (
            <button onClick={onViewAll} className="text-xs text-muted-foreground hover:text-foreground">
              View all
            </button>
          ) : null}
        </div>
      </CardHeader>
      <CardContent className="pb-[34px] relative overflow-hidden">
        {loading ? (
          <ul className="divide-y">
            {Array.from({ length: 4 }).map((_, i) => (
              <li key={i} className="py-2 flex items-center justify-between gap-3">
                <div className="min-w-0 h-3 w-48 bg-muted animate-pulse rounded" />
                <div className="h-3 w-16 bg-muted animate-pulse rounded" />
              </li>
            ))}
          </ul>
        ) : items?.length ? (
          <div className="max-h-[132px] overflow-y-auto scrollbar-hide pr-1">
            <ul className="divide-y">
              {items.map((r) => {
                const d = r.date ? new Date(r.date as any) : null;
                const dateStr = d ? d.toLocaleDateString(undefined, { month: "short", day: "numeric" }) : undefined;
                return (
                  <li key={r.id} className="py-2 flex items-center justify-between gap-3">
                    <div className="min-w-0 text-sm truncate">
                      <span className="font-medium truncate">{r.description || "—"}</span>
                      {dateStr ? <span className="text-muted-foreground"> • {dateStr}</span> : null}
                    </div>
                    <div className={`text-sm ${r.type === "expense" ? "text-red-500" : "text-emerald-500"}`}>
                      {formatAmount({ currency, amount: Number(r.amount || 0) })}
                    </div>
                  </li>
                );
              })}
            </ul>
          </div>
        ) : (
          <div className="text-sm text-muted-foreground">No transactions</div>
        )}
        <div className="pointer-events-none absolute bottom-0 left-0 right-0 h-8 bg-gradient-to-b from-transparent to-background" />
      </CardContent>
    </Card>
  );
}
