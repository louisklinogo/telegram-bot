import {
  getSpendingByCategory,
  getTransactionStats,
  getTransactionsEnriched,
} from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { TransactionsView } from "./_components/transactions-view";

export default async function TransactionsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const now = new Date();
  const end = new Date(
    Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 23, 59, 59)
  );
  const start30 = new Date(now.getTime() - 86_400_000 * 29);
  const start = new Date(
    Date.UTC(start30.getUTCFullYear(), start30.getUTCMonth(), start30.getUTCDate(), 0, 0, 0)
  );

  const [transactions, stats, spending] = await Promise.all([
    getTransactionsEnriched(db, { teamId, limit: 50 }),
    getTransactionStats(db, { teamId, startDate: start, endDate: end }),
    getSpendingByCategory(db, { teamId, startDate: start, endDate: end, limit: 10 }),
  ]);

  return (
    <TransactionsView
      initialSpending={spending}
      initialStats={stats}
      initialTransactions={transactions}
    />
  );
}
