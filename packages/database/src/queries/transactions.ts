import { and, desc, eq, isNull, sql, lt, or } from "drizzle-orm";
import type { DbClient } from "../client";
import { transactions, clients } from "../schema";

export async function getTransactionsWithClient(
  db: DbClient,
  params: {
    teamId: string;
    type?: "payment" | "expense" | "refund" | "adjustment";
    limit?: number;
    cursor?: { transactionDate: Date | null; id: string } | null;
  },
) {
  const { teamId, type, limit = 50, cursor } = params;
  return await db
    .select({ trx: transactions, client: clients })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        type ? eq(transactions.type, type) : sql`true`,
        cursor?.transactionDate
          ? or(
              lt(transactions.transactionDate, cursor.transactionDate),
              and(
                eq(transactions.transactionDate, cursor.transactionDate),
                lt(transactions.id, cursor.id),
              ),
            )
          : sql`true`,
      ),
    )
    .orderBy(desc(transactions.transactionDate), desc(transactions.id))
    .limit(limit);
}

export async function getTransactionStats(db: DbClient, teamId: string) {
  const res: any = await db.execute(sql<{
    total_income: string | null;
    total_expenses: string | null;
    pending_payments: string | null;
    completed_transactions: number | null;
  }>`
    SELECT 
      COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN type = 'expense' AND status = 'completed' THEN amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN type = 'payment' AND status = 'pending' THEN amount ELSE 0 END), 0) AS pending_payments,
      COUNT(*) FILTER (WHERE status = 'completed') AS completed_transactions
    FROM transactions
    WHERE team_id = ${teamId} AND deleted_at IS NULL
  `);

  const row = res?.rows?.[0] ||
    res?.[0] || {
      total_income: "0",
      total_expenses: "0",
      pending_payments: "0",
      completed_transactions: 0,
    };
  return {
    totalIncome: Number(row.total_income || 0),
    totalExpenses: Number(row.total_expenses || 0),
    netProfit: Number(row.total_income || 0) - Number(row.total_expenses || 0),
    pendingPayments: Number(row.pending_payments || 0),
    completedTransactions: Number(row.completed_transactions || 0),
  };
}
