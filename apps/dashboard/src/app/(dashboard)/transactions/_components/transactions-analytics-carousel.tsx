"use client";

import { useMemo, useRef, useState } from "react";
import { trpc } from "@/lib/trpc/client";
import { useTeamCurrency } from "@/hooks/use-team-currency";
import { DropdownMenu, DropdownMenuCheckboxItem, DropdownMenuContent, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { Button } from "@/components/ui/button";
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/widgets/carousel";
import { TransactionsTotalIncome } from "@/components/analytics/transactions-total-income";
import { TransactionsTotalExpenses } from "@/components/analytics/transactions-total-expenses";
import { TransactionsNetProfit } from "@/components/analytics/transactions-net-profit";
import { TransactionsPendingPayments } from "@/components/analytics/transactions-pending-payments";
import { TransactionsSpending } from "@/components/analytics/transactions-spending";
import { TransactionsRecent } from "@/components/analytics/transactions-recent";
import { Sheet, SheetContent, SheetHeader, SheetTitle } from "@/components/ui/sheet";

type PeriodId = "last_30d" | "this_month" | "last_month" | "all_time";

function startOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 0, 0, 0));
}
function endOfDayUTC(d: Date) {
  return new Date(Date.UTC(d.getUTCFullYear(), d.getUTCMonth(), d.getUTCDate(), 23, 59, 59));
}

function computeRangeStable(period: PeriodId, anchor: Date): { start?: string; end?: string } {
  const toISO = (dt: Date) => dt.toISOString();
  if (period === "all_time") return {};
  if (period === "this_month") {
    const s = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 1));
    return { start: toISO(s), end: toISO(endOfDayUTC(anchor)) };
  }
  if (period === "last_month") {
    const s = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth() - 1, 1));
    const e = new Date(Date.UTC(anchor.getUTCFullYear(), anchor.getUTCMonth(), 0, 23, 59, 59));
    return { start: toISO(s), end: toISO(e) };
  }
  // last_30d
  const s = new Date(anchor.getTime() - 86400000 * 29);
  return { start: toISO(startOfDayUTC(s)), end: toISO(endOfDayUTC(anchor)) };
}

type TransactionsAnalyticsCarouselProps = {
  initialStats?: any;
  initialSpending?: any[];
  initialRecent?: any[];
};

export function TransactionsAnalyticsCarousel({ initialStats, initialSpending, initialRecent }: TransactionsAnalyticsCarouselProps) {
  const currency = useTeamCurrency();
  const [period, setPeriod] = useState<PeriodId>("last_30d");
  const nowRef = useRef<Date>(new Date());
  const range = useMemo(() => computeRangeStable(period, nowRef.current), [period]);

  const commonOpts = { staleTime: 30000, refetchOnMount: false as const, refetchOnWindowFocus: false as const, refetchOnReconnect: false as const, retry: false as const };
  const { data: statsData, isLoading: statsLoading } = trpc.transactions.stats.useQuery({ startDate: range.start, endDate: range.end }, { ...commonOpts, initialData: initialStats } as any);
  const { data: spendingData, isLoading: spendingLoading } = trpc.transactions.spending.useQuery({ startDate: range.start, endDate: range.end, limit: 10 }, { ...commonOpts, initialData: initialSpending } as any);
  const { data: recentLite, isLoading: recentLoading } = trpc.transactions.recentLite.useQuery({ limit: 8, startDate: range.start, endDate: range.end }, { ...commonOpts, initialData: initialRecent } as any);
  const recent = (recentLite as any[]) ?? [];

  const [openRecent, setOpenRecent] = useState(false);
  const [openSpending, setOpenSpending] = useState(false);

  const { data: recentAll = [], isLoading: recentAllLoading } = trpc.transactions.recentLite.useQuery(
    { limit: 50, startDate: range.start, endDate: range.end },
    { ...commonOpts, enabled: openRecent } as any,
  );
  const { data: spendingAll = [], isLoading: spendingAllLoading } = trpc.transactions.spending.useQuery(
    { startDate: range.start, endDate: range.end, limit: 50 },
    { ...commonOpts, enabled: openSpending } as any,
  );
  const spendingAllArr = (spendingAll as any[]) || [];
  const spendingAllTotal = spendingAllArr.reduce((sum: number, r: any) => sum + Number(r?.total || 0), 0);

  return (
    <div className="pt-6">
      <Carousel className="flex flex-col" opts={{ align: "start", containScroll: "trimSnaps", slidesToScroll: "auto" }}>
        <div className="flex items-center justify-between gap-2 mb-3 sm:mb-4">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" className="h-8 gap-1">
                <span className="text-sm">
                  {period === "last_30d" && "Last 30 days"}
                  {period === "this_month" && "This month"}
                  {period === "last_month" && "Last month"}
                  {period === "all_time" && "All time"}
                </span>
                <Icons.ChevronDown className="h-4 w-4" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-[180px]">
              {["last_30d","this_month","last_month","all_time"].map((id) => (
                <DropdownMenuCheckboxItem key={id} checked={period===id} onCheckedChange={() => setPeriod(id as PeriodId)}>
                  {id === "last_30d" && "Last 30 days"}
                  {id === "this_month" && "This month"}
                  {id === "last_month" && "Last month"}
                  {id === "all_time" && "All time"}
                </DropdownMenuCheckboxItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <div className="hidden md:flex items-center">
            <CarouselPrevious className="static top-auto translate-y-0 p-0 border-none hover:bg-transparent" />
            <CarouselNext className="static top-auto translate-y-0 p-0 border-none hover:bg-transparent" />
          </div>
        </div>

        <CarouselContent className="pr-4">
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsTotalIncome loading={statsLoading} amount={(statsData as any)?.totalIncome || 0} currency={currency} subtitle={period === "all_time" ? "All time" : "Selected period"} />
          </CarouselItem>
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsTotalExpenses loading={statsLoading} amount={(statsData as any)?.totalExpenses || 0} currency={currency} subtitle={period === "all_time" ? "All time" : "Selected period"} />
          </CarouselItem>
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsNetProfit loading={statsLoading} amount={(statsData as any)?.netProfit || 0} currency={currency} />
          </CarouselItem>
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsPendingPayments loading={statsLoading} amount={(statsData as any)?.pendingPayments || 0} currency={currency} />
          </CarouselItem>
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsSpending loading={spendingLoading} rows={(spendingData as any[]) ?? []} currency={currency} onViewAll={() => setOpenSpending(true)} />
          </CarouselItem>
          <CarouselItem className="sm:basis-1/2 lg:basis-1/4">
            <TransactionsRecent loading={recentLoading} items={recent} currency={currency} onViewAll={() => setOpenRecent(true)} />
          </CarouselItem>
        </CarouselContent>

        {/* Recent sheet */}
        <Sheet open={openRecent} onOpenChange={setOpenRecent}>
          <SheetContent side="right" className="mr-4 md:mr-6">
            <SheetHeader>
              <SheetTitle>Recent transactions</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {recentAllLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 8 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2">
                      <div className="min-w-0">
                        <div className="h-4 w-48 bg-muted animate-pulse rounded mb-1" />
                        <div className="h-3 w-24 bg-muted animate-pulse rounded" />
                      </div>
                      <div className="h-4 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : (recentAll as any[])?.length ? (
                <ul className="divide-y">
                  {(recentAll as any[]).map((r) => (
                    <li key={r.id} className="py-3 flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="text-sm font-medium truncate">{r.description || "—"}</div>
                        <div className="text-xs text-muted-foreground truncate">{r.clientName || "Unknown"} • {new Date(r.date || Date.now()).toLocaleDateString()}</div>
                      </div>
                      <div className={`text-sm ${r.type === "expense" ? "text-red-500" : "text-emerald-500"}`}>
                        {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(r.amount || 0))}
                      </div>
                    </li>
                  ))}
                </ul>
              ) : (
                <div className="text-sm text-muted-foreground">No transactions</div>
              )}
            </div>
          </SheetContent>
        </Sheet>

        {/* Spending sheet */}
        <Sheet open={openSpending} onOpenChange={setOpenSpending}>
          <SheetContent side="right" className="mr-4 md:mr-6">
            <SheetHeader>
              <SheetTitle>Spending by category</SheetTitle>
            </SheetHeader>
            <div className="mt-4">
              {spendingAllLoading ? (
                <div className="space-y-2">
                  {Array.from({ length: 10 }).map((_, i) => (
                    <div key={i} className="flex items-center justify-between gap-3 py-2">
                      <div className="h-3 w-32 bg-muted animate-pulse rounded" />
                      <div className="h-3 w-16 bg-muted animate-pulse rounded" />
                    </div>
                  ))}
                </div>
              ) : spendingAllArr.length ? (
                <ul className="space-y-2">
                  {spendingAllArr.map((row: any) => {
                    const pct = spendingAllTotal > 0 ? Math.max(0, Math.min(100, Number(row.total || 0) / spendingAllTotal * 100)) : 0;
                    return (
                      <li key={row.slug}>
                        <div className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-2 min-w-0">
                            <span className="h-2 w-2 rounded-sm" style={{ backgroundColor: row.color || '#9b9b9b' }} />
                            <span className="truncate">{row.name}</span>
                          </div>
                          <span className="text-sm text-muted-foreground">
                            {new Intl.NumberFormat(undefined, { style: 'currency', currency }).format(Number(row.total || 0))}
                          </span>
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
            </div>
          </SheetContent>
        </Sheet>
      </Carousel>
    </div>
  );
}
