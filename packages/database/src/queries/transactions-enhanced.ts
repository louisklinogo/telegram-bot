import { and, desc, eq, isNull, sql, lt, or, gte, lte, inArray, ilike } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  transactions,
  clients,
  transactionCategories,
  transactionTags,
  transactionAttachments,
  tags,
  users,
} from "../schema";

type TransactionTagJson = { id: string; name: string; color: string | null };
type TransactionAttachmentJson = {
  id: string;
  name: string;
  type: string | null;
  size: number | null;
  path: string[];
  mimeType: string | null;
};

/**
 * Enhanced query with all joins for transaction data
 * Includes: client, category, tags, attachments count, assigned user
 */
export async function getTransactionsEnriched(
  db: DbClient,
  params: {
    teamId: string;
    type?: "payment" | "expense" | "refund" | "adjustment";
    status?: string[];
    categories?: string[];
    tags?: string[];
    assignedId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    hasAttachments?: boolean;
    accounts?: string[];
    amountMin?: number;
    amountMax?: number;
    limit?: number;
    cursor?: { date: Date | null; id: string } | null;
  }
) {
  const {
    teamId,
    type,
    status,
    categories,
    tags: tagIds,
    assignedId,
    search,
    startDate,
    endDate,
    hasAttachments,
    accounts,
    amountMin,
    amountMax,
    limit = 50,
    cursor,
  } = params;

  // Build where conditions
  const whereConditions = and(
    eq(transactions.teamId, teamId),
    isNull(transactions.deletedAt),
    type ? eq(transactions.type, type) : sql`true`,
    status && status.length > 0 ? inArray(transactions.status, status as any) : sql`true`,
    categories && categories.length > 0
      ? inArray(transactions.categorySlug, categories)
      : sql`true`,
    assignedId ? eq(transactions.assignedId, assignedId) : sql`true`,
    accounts && accounts.length > 0 ? inArray(transactions.accountId, accounts as any) : sql`true`,
    search
      ? or(
          ilike(transactions.name, `%${search}%`),
          ilike(transactions.description, `%${search}%`),
          ilike(transactions.counterpartyName, `%${search}%`)
        )
      : sql`true`,
    amountMin != null ? gte(transactions.amount, amountMin as any) : sql`true`,
    amountMax != null ? lte(transactions.amount, amountMax as any) : sql`true`,
    startDate ? gte(transactions.date, startDate.toISOString().slice(0, 10)) : sql`true`,
    endDate ? lte(transactions.date, endDate.toISOString().slice(0, 10)) : sql`true`,
    cursor?.date
      ? or(
          lt(transactions.date, cursor.date.toISOString().slice(0, 10)),
          and(eq(transactions.date, cursor.date.toISOString().slice(0, 10)), lt(transactions.id, cursor.id))
        )
      : sql`true`
  );

  // Base query with aggregations
  const query = db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      assignedUser: users,
      // Aggregate tags
      tags: sql<TransactionTagJson[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${tags.id},
              'name', ${tags.name},
              'color', ${tags.color}
            )
          ) FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'::json
        )
      `,
      // Count attachments
      attachmentCount: sql<number>`
        COUNT(DISTINCT ${transactionAttachments.id})
      `,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .leftJoin(users, eq(transactions.assignedId, users.id))
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .leftJoin(transactionAttachments, eq(transactions.id, transactionAttachments.transactionId))
    .where(whereConditions)
    .groupBy(
      transactions.id,
      clients.id,
      transactionCategories.id,
      users.id
    )
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  const results = await query;

  // Apply attachment filter if specified
  if (hasAttachments !== undefined) {
    return results.filter((r) =>
      hasAttachments ? r.attachmentCount > 0 : r.attachmentCount === 0
    );
  }

  // Apply tag filter if specified
  if (tagIds && tagIds.length > 0) {
    return results.filter((r) => {
      const transactionTagIds = r.tags.map((t) => t.id);
      return tagIds.some((tagId) => transactionTagIds.includes(tagId));
    });
  }

  return results;
}

/**
 * Full-text search across transactions
 */
export async function searchTransactions(
  db: DbClient,
  params: {
    teamId: string;
    query: string;
    limit?: number;
  }
) {
  const { teamId, query, limit = 20 } = params;

  // Use FTS on the stored generated column fts_vector (set up by migrations)
  // Order by rank, then date/id for stable pagination
  const results = await db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      rank: sql<number>`ts_rank_cd(fts_vector, websearch_to_tsquery('english', ${query}))`,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        sql`fts_vector @@ websearch_to_tsquery('english', ${query})`
      )
    )
    .orderBy(sql`rank DESC`, desc(transactions.date), desc(transactions.id))
    .limit(limit);

  return results;
}

/**
 * Bulk update transactions
 */
export async function updateTransactionsBulk(
  db: DbClient,
  params: {
    teamId: string;
    transactionIds: string[];
    updates: {
      categorySlug?: string;
      status?: "pending" | "completed" | "failed" | "cancelled";
      assignedId?: string | null;
      recurring?: boolean;
      frequency?: "weekly" | "biweekly" | "monthly" | "semi_monthly" | "annually" | "irregular" | null;
      excludeFromAnalytics?: boolean;
    };
  }
) {
  const { teamId, transactionIds, updates } = params;

  return await db
    .update(transactions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.teamId, teamId),
        inArray(transactions.id, transactionIds),
        isNull(transactions.deletedAt)
      )
    )
    .returning();
}

/**
 * Bulk soft delete transactions (manual only)
 */
export async function softDeleteTransactionsBulk(
  db: DbClient,
  params: {
    teamId: string;
    transactionIds: string[];
  }
) {
  const { teamId, transactionIds } = params;

  const res = await db
    .update(transactions)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(
      and(
        eq(transactions.teamId, teamId),
        inArray(transactions.id, transactionIds),
        isNull(transactions.deletedAt),
        eq(transactions.manual, true)
      )
    )
    .returning({ id: transactions.id });

  return { deletedCount: res.length, ids: res.map((r) => r.id) };
}

/**
 * Get single transaction with full details
 */
export async function getTransactionById(
  db: DbClient,
  params: {
    teamId: string;
    transactionId: string;
  }
) {
  const { teamId, transactionId } = params;

  const result = await db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      assignedUser: users,
      tags: sql<TransactionTagJson[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${tags.id},
              'name', ${tags.name},
              'color', ${tags.color}
            )
          ) FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'::json
        )
      `,
      attachments: sql<TransactionAttachmentJson[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${transactionAttachments.id},
              'name', ${transactionAttachments.name},
              'type', ${transactionAttachments.type},
              'size', ${transactionAttachments.size},
              'path', ${transactionAttachments.path},
              'mimeType', ${transactionAttachments.mimeType}
            )
          ) FILTER (WHERE ${transactionAttachments.id} IS NOT NULL),
          '[]'::json
        )
      `,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .leftJoin(users, eq(transactions.assignedId, users.id))
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .leftJoin(transactionAttachments, eq(transactions.id, transactionAttachments.transactionId))
    .where(
      and(
        eq(transactions.teamId, teamId),
        eq(transactions.id, transactionId),
        isNull(transactions.deletedAt)
      )
    )
    .groupBy(transactions.id, clients.id, transactionCategories.id, users.id)
    .limit(1);

  return result[0];
}

/**
 * Get transaction categories (hierarchical)
 */
export async function getTransactionCategories(
  db: DbClient,
  params: {
    teamId: string;
  }
) {
  const { teamId } = params;

  const allCategories = await db
    .select()
    .from(transactionCategories)
    .where(eq(transactionCategories.teamId, teamId))
    .orderBy(desc(transactionCategories.system), transactionCategories.name);

  // Build hierarchy
  const categoryMap = new Map();
  const roots: any[] = [];

  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id);
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}

/**
 * Get all tags for team
 */
export async function getTransactionTags(
  db: DbClient,
  params: {
    teamId: string;
  }
) {
  const { teamId } = params;

  return await db.select().from(tags).where(eq(tags.teamId, teamId)).orderBy(tags.name);
}
