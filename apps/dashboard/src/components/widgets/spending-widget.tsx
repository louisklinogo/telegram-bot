"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { trpc } from "@/lib/trpc/client";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";

type Period = "last_30d" | "last_90d" | "this_month" | "last_month";

const periodOptions: { id: Period; label: string; range: () => { start: string; end: string } }[] = [
  {
    id: "last_30d",
    label: "Last 30 days",
    range: () => {
      const now = new Date();
      const start = new Date(now.getTime() - 29 * 86400000);
      return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    },
  },
  {
    id: "last_90d",
    label: "Last 90 days",
    range: () => {
      const now = new Date();
      const start = new Date(now.getTime() - 89 * 86400000);
      return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    },
  },
  {
    id: "this_month",
    label: "This month",
    range: () => {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1));
      return { start: start.toISOString().slice(0, 10), end: now.toISOString().slice(0, 10) };
    },
  },
  {
    id: "last_month",
    label: "Last month",
    range: () => {
      const now = new Date();
      const start = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth() - 1, 1));
      const end = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 0));
      return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
    },
  },
];

export function SpendingWidget() {
  const [period, setPeriod] = useState<Period>("last_30d");
  const range = periodOptions.find((p) => p.id === period)!.range();

  const { data } = trpc.transactions.enrichedList.useQuery({
    type: "expense",
    startDate: new Date(`${range.start}T00:00:00Z`).toISOString(),
    endDate: new Date(`${range.end}T23:59:59Z`).toISOString(),
    limit: 200,
  } as any, { staleTime: 30_000 });

  const items = (data as any)?.items ?? [];

  const byCategory = useMemo(() => {
    const map = new Map<string, { name: string; color?: string | null; amount: number }>();
    for (const r of items) {
      const trx = r.transaction || r.trx || r;
      if (!trx || trx.type !== "expense" || trx.excludeFromAnalytics) continue;
      const key = r.category?.slug || trx.categorySlug || "uncategorized";
      const name = r.category?.name || trx.categorySlug || "Uncategorized";
      const color = r.category?.color ?? null;
      const prev = map.get(key) || { name, color, amount: 0 };
      prev.amount += Number(trx.amount || 0);
      map.set(key, prev);
    }
    const arr = Array.from(map.entries()).map(([slug, v]) => ({ slug, ...v }));
    arr.sort((a, b) => b.amount - a.amount);
    const total = arr.reduce((s, r) => s + r.amount, 0) || 1;
    return { arr, total };
  }, [items]);

  return (
    <div className="border aspect-square relative overflow-hidden">
      <div className="p-4 md:p-8 flex-col">
        <div className="flex justify-between">
          <div>
            <Link href={`/transactions?type=expense&start=${range.start}&end=${range.end}`} prefetch>
              <h2 className="text-lg">Spending</h2>
            </Link>
          </div>
          <DropdownMenu>
            <DropdownMenuTrigger>
              <div className="flex items-center space-x-2">
                <span>{periodOptions.find((o) => o.id === period)?.label}</span>
                <Icons.ChevronDown />
              </div>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]">
              {periodOptions.map((opt) => (
                <DropdownMenuCheckboxItem key={opt.id} onCheckedChange={() => setPeriod(opt.id)} checked={opt.id === period}>
                  {opt.label}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {byCategory.arr.length === 0 ? (
          <div className="flex items-center justify-center aspect-square">
            <p className="text-sm text-muted-foreground -mt-12">No spending yet</p>
          </div>
        ) : (
          <ul className="mt-4 space-y-2 overflow-auto scrollbar-hide aspect-square pb-24">
            {byCategory.arr.slice(0, 12).map((row) => {
              const pct = Math.round((row.amount / byCategory.total) * 100);
              return (
                <li key={row.slug} className="flex items-center gap-3">
                  <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: row.color || "#9b9b9b" }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between text-sm">
                      <span className="truncate">{row.name}</span>
                      <span className="text-muted-foreground text-xs">{pct}%</span>
                    </div>
                    <div className="h-2 bg-muted rounded">
                      <div className="h-2 rounded" style={{ width: `${pct}%`, backgroundColor: row.color || "#9b9b9b" }} />
                    </div>
                  </div>
                </li>
              );
            })}
          </ul>
        )}
      </div>
    </div>
  );
}
