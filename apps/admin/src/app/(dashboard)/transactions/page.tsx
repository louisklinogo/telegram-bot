import { redirect } from "next/navigation";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getTransactionsEnriched, getTransactionStats, getInvoicesWithOrder } from "@cimantikos/database/queries";
import { TransactionsView } from "./_components/transactions-view";

export default async function TransactionsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB queries in Server Component
  const [transactions, stats, invoices] = await Promise.all([
    getTransactionsEnriched(db, { teamId, limit: 50 }),
    getTransactionStats(db, teamId),
    getInvoicesWithOrder(db, { teamId, limit: 50 }),
  ]);

  return (
    <TransactionsView
      initialTransactions={transactions}
      initialStats={stats}
      initialInvoices={invoices}
    />
  );
}
