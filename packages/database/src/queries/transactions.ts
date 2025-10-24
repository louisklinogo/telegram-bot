import { and, desc, eq, isNull, sql, lt, or, gte, lte } from "drizzle-orm";
import type { DbClient } from "../client";
import { transactions, clients, transactionCategories } from "../schema";

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

export async function getTransactionStats(db: DbClient, params: { teamId: string; startDate?: Date; endDate?: Date }) {
  const { teamId, startDate, endDate } = params;
  const startStr = startDate ? startDate.toISOString().slice(0, 10) : null;
  const endStr = endDate ? endDate.toISOString().slice(0, 10) : null;

  const res: any = await db.execute(sql<{
    total_income: string | null;
    total_expenses: string | null;
    pending_payments: string | null;
    completed_transactions: number | null;
  }>`
    SELECT 
      COALESCE(SUM(CASE WHEN t.type = 'payment' AND t.status = 'completed' AND t.exclude_from_analytics IS NOT TRUE THEN t.amount ELSE 0 END), 0) AS total_income,
      COALESCE(SUM(CASE WHEN t.type = 'expense' AND t.status = 'completed' AND t.exclude_from_analytics IS NOT TRUE THEN t.amount ELSE 0 END), 0) AS total_expenses,
      COALESCE(SUM(CASE WHEN t.type = 'payment' AND t.status = 'pending' AND t.exclude_from_analytics IS NOT TRUE THEN t.amount ELSE 0 END), 0) AS pending_payments,
      COUNT(*) FILTER (WHERE t.status = 'completed') AS completed_transactions
    FROM transactions t
    LEFT JOIN transaction_categories c
      ON c.team_id = t.team_id AND c.slug = t.category_slug
    WHERE t.team_id = ${teamId}
      AND t.deleted_at IS NULL
      ${startStr ? sql`AND t.date >= ${startStr}` : sql``}
      ${endStr ? sql`AND t.date <= ${endStr}` : sql``}
      AND (c.id IS NULL OR c.excluded IS NOT TRUE)
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

export async function getSpendingByCategory(
  db: DbClient,
  params: { teamId: string; startDate?: Date; endDate?: Date; limit?: number },
) {
  const { teamId, startDate, endDate, limit = 12 } = params;
  const startStr = startDate ? startDate.toISOString().slice(0, 10) : null;
  const endStr = endDate ? endDate.toISOString().slice(0, 10) : null;

  const rows = await db
    .select({
      slug: transactions.categorySlug,
      name: transactionCategories.name,
      color: transactionCategories.color,
      total: sql<string>`COALESCE(SUM(${transactions.amount}), 0)`,
    })
    .from(transactions)
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug),
      ),
    )
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        eq(transactions.type, "expense" as any),
        eq(transactions.status, "completed" as any),
        sql`${transactions.excludeFromAnalytics} IS NOT TRUE`,
        // Exclude categories marked as excluded; keep uncategorized
        or(isNull(transactionCategories.id), eq(transactionCategories.excluded, false)),
        startStr ? gte(transactions.date, startStr as any) : sql`true`,
        endStr ? lte(transactions.date, endStr as any) : sql`true`,
      ),
    )
    .groupBy(transactions.categorySlug, transactionCategories.name, transactionCategories.color)
    .orderBy(desc(sql`SUM(${transactions.amount})`))
    .limit(limit);

  return rows.map((r) => ({
    slug: r.slug || "uncategorized",
    name: r.name || r.slug || "Uncategorized",
    color: r.color,
    total: Number(r.total || 0),
  }));
}

// Lightweight recent transactions for analytics card
export async function getRecentTransactionsLite(
  db: DbClient,
  params: { teamId: string; startDate?: Date; endDate?: Date; limit?: number },
) {
  const { teamId, startDate, endDate, limit = 8 } = params;
  const startStr = startDate ? startDate.toISOString().slice(0, 10) : null;
  const endStr = endDate ? endDate.toISOString().slice(0, 10) : null;

  const rows = await db
    .select({
      id: transactions.id,
      description: transactions.description,
      name: transactions.name,
      type: transactions.type,
      amount: transactions.amount,
      clientName: clients.name,
      date: transactions.date,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        startStr ? gte(transactions.date, startStr as any) : sql`true`,
        endStr ? lte(transactions.date, endStr as any) : sql`true`,
      ),
    )
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  return rows.map((r) => ({
    id: r.id,
    description: r.description ?? r.name ?? null,
    clientName: r.clientName ?? null,
    type: r.type as any,
    amount: Number(r.amount || 0),
    date: r.date,
  }));
}
