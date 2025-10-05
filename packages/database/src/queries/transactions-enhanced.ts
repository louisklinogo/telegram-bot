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
    search
      ? or(
          ilike(transactions.name, `%${search}%`),
          ilike(transactions.description, `%${search}%`),
          ilike(transactions.counterpartyName, `%${search}%`)
        )
      : sql`true`,
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
      tags: sql<any[]>`
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
      const transactionTagIds = r.tags.map((t: any) => t.id);
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

  // Note: This requires FTS setup from migrations
  return await db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
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
        // Will use fts_vector once created
        or(
          ilike(transactions.name, `%${query}%`),
          ilike(transactions.description, `%${query}%`),
          ilike(transactions.counterpartyName, `%${query}%`)
        )
      )
    )
    .limit(limit);
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
      tags: sql<any[]>`
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
      attachments: sql<any[]>`
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
    .orderBy(transactionCategories.name);

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
