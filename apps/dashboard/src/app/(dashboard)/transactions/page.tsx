import {
  getSpendingByCategory,
  getTransactionStats,
  getTransactionsEnriched,
} from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { TransactionsView } from "./_components/transactions-view";

type SearchParams = {
  [key: string]: string | string[] | undefined;
};

export default async function TransactionsPage({ searchParams }: { searchParams?: SearchParams }) {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const params = searchParams ?? {};
  const readStr = (k: string): string | undefined => {
    const v = params[k];
    if (Array.isArray(v)) return v[0] || undefined;
    return v && v.trim() !== "" ? v : undefined;
  };
  const readArr = (k: string): string[] | undefined => {
    const v = params[k];
    if (!v) return;
    if (Array.isArray(v)) {
      const arr = v.filter(Boolean) as string[];
      return arr.length ? arr : undefined;
    }
    const arr = v
      .split(",")
      .map((s) => s.trim())
      .filter((s) => s.length > 0);
    return arr.length ? arr : undefined;
  };

  const startStr = readStr("start");
  const endStr = readStr("end");
  const toStartUTC = (s: string) => new Date(`${s}T00:00:00.000Z`);
  const toEndUTC = (s: string) => new Date(`${s}T23:59:59.000Z`);

  const now = new Date();
  const defaultEnd = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)
  );
  const start30 = new Date(now.getTime() - 86_400_000 * 29);
  const defaultStart = new Date(
    Date.UTC(start30.getUTCFullYear(), start30.getUTCMonth(), start30.getUTCDate(), 0, 0, 0)
  );

  const startDate = startStr ? toStartUTC(startStr) : defaultStart;
  const endDate = endStr ? toEndUTC(endStr) : defaultEnd;

  // Build enriched list input (mirror client logic)
  const allowedTypes = new Set(["payment", "expense", "refund", "adjustment"]);
  const typeParam = readStr("type");
  const filterType = typeParam && allowedTypes.has(typeParam) ? (typeParam as any) : undefined;
  const statuses = readArr("statuses");
  const categories = readArr("categories");
  const tags = readArr("tags");
  const accounts = readArr("accounts");
  const assignees = readArr("assignees");
  const q = readStr("q");
  const attachments = readStr("attachments"); // include|exclude
  const hasAttachments =
    attachments === "include" ? true : attachments === "exclude" ? false : undefined;
  const recurringStr = readStr("recurring");
  const isRecurring = recurringStr === "true" ? true : recurringStr === "false" ? false : undefined;
  const amountRangeStr = readStr("amount_range");
  const [amountMin, amountMax] = amountRangeStr
    ? amountRangeStr
        .split(",")
        .map((n) => Number(n))
        .slice(0, 2)
    : [undefined, undefined];

  const enrichedInput = {
    type: filterType,
    status: statuses as any,
    categories,
    tags,
    accounts,
    assignees: assignees as any,
    isRecurring,
    search: q,
    startDate,
    endDate,
    hasAttachments,
    amountMin: Number.isFinite(amountMin as number) ? (amountMin as number) : undefined,
    amountMax: Number.isFinite(amountMax as number) ? (amountMax as number) : undefined,
    includeTags: false, // lightweight server initial fetch; client will refetch if tags are needed
    limit: 50,
  } as const;

  const [transactions, stats, spending] = await Promise.all([
    getTransactionsEnriched(db, { teamId, ...enrichedInput }),
    getTransactionStats(db, { teamId, startDate, endDate }),
    getSpendingByCategory(db, { teamId, startDate, endDate, limit: 10 }),
  ]);

  return (
    <TransactionsView
      initialSpending={spending}
      initialStats={stats}
      initialTransactions={transactions}
    />
  );
}
