import { redirect } from "next/navigation";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getTransactionsEnriched, getTransactionStats } from "@Faworra/database/queries";
import { TransactionsView } from "./_components/transactions-view";

export default async function TransactionsPageV1() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const [transactions, stats] = await Promise.all([
    getTransactionsEnriched(db, { teamId, limit: 50 }),
    getTransactionStats(db, { teamId }),
  ]);

  return <TransactionsView initialTransactions={transactions} initialStats={stats} />;
}
