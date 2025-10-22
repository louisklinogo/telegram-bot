import { and, desc, eq, isNull, sql, lt, or, gte, lte, inArray, ilike } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  transactions,
  clients,
  transactionCategories,
  transactionTags,
  transactionAttachments,
  transactionAllocations,
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
    assignees?: string[];
    search?: string;
    startDate?: Date;
    endDate?: Date;
    hasAttachments?: boolean;
    accounts?: string[];
    amountMin?: number;
    amountMax?: number;
    isRecurring?: boolean;
    fulfilled?: boolean; // derived: attachments OR completed
    includeTags?: boolean; // controls whether to aggregate tag data
    limit?: number;
    cursor?: { date: Date | null; id: string } | null;
  },
) {
  const {
    teamId,
    type,
    status,
    categories,
    tags: tagIds,
    assignedId,
    assignees,
    search,
    startDate,
    endDate,
    hasAttachments,
    accounts,
    amountMin,
    amountMax,
    isRecurring,
    fulfilled,
    includeTags = true,
    limit = 50,
    cursor,
  } = params;

  // Build where conditions
  // Build attachment/tag EXISTS subqueries per Midday style
  const attachmentsExist = sql`EXISTS (
    SELECT 1 FROM transaction_attachments ta
    WHERE ta.transaction_id = ${transactions.id}
      AND ta.team_id = ${teamId}
  )`;

  const tagsExist = (tagIds: string[]) => sql`EXISTS (
    SELECT 1
    FROM transaction_tags tt
    JOIN tags t ON t.id = tt.tag_id
    WHERE tt.transaction_id = ${transactions.id}
      AND tt.team_id = ${teamId}
      AND t.id = ANY(ARRAY[${sql.join(tagIds.map((id) => sql`${id}`), sql`, `)}])
  )`;

  const whereConditions = and(
    eq(transactions.teamId, teamId),
    isNull(transactions.deletedAt),
    type ? eq(transactions.type, type) : sql`true`,
    status && status.length > 0 ? inArray(transactions.status, status as any) : sql`true`,
    categories && categories.length > 0
      ? inArray(transactions.categorySlug, categories)
      : sql`true`,
    assignedId ? eq(transactions.assignedId, assignedId) : sql`true`,
    assignees && assignees.length > 0
      ? inArray(transactions.assignedId, assignees as any)
      : sql`true`,
    accounts && accounts.length > 0 ? inArray(transactions.accountId, accounts as any) : sql`true`,
    isRecurring != null ? eq(transactions.recurring, isRecurring) : sql`true`,
    search
      ? sql`fts_vector @@ websearch_to_tsquery('english', ${search})`
      : sql`true`,
    amountMin != null ? gte(transactions.amount, amountMin as any) : sql`true`,
    amountMax != null ? lte(transactions.amount, amountMax as any) : sql`true`,
    startDate ? gte(transactions.date, startDate.toISOString().slice(0, 10)) : sql`true`,
    endDate ? lte(transactions.date, endDate.toISOString().slice(0, 10)) : sql`true`,
    // Attachments include/exclude in WHERE via EXISTS
    hasAttachments === true ? attachmentsExist : sql`true`,
    hasAttachments === false ? sql`NOT (${attachmentsExist})` : sql`true`,
    // Fulfilled derived flag
    fulfilled === true
      ? sql`( ${attachmentsExist} OR ${eq(transactions.status, 'completed' as any)} )`
      : sql`true`,
    fulfilled === false
      ? sql`NOT ( ${attachmentsExist} OR ${eq(transactions.status, 'completed' as any)} )`
      : sql`true`,
    // Tags filter via EXISTS
    tagIds && tagIds.length > 0 ? tagsExist(tagIds) : sql`true`,
    cursor?.date
      ? or(
          lt(
            transactions.date,
            typeof cursor.date === "string"
              ? cursor.date
              : cursor.date.toISOString().slice(0, 10),
          ),
          and(
            eq(
              transactions.date,
              typeof cursor.date === "string"
                ? cursor.date
                : cursor.date.toISOString().slice(0, 10),
            ),
            lt(transactions.id, cursor.id),
          ),
        )
      : sql`true`,
  );

  // Base query with aggregations
  // Build dynamic select fields
  const tagSelect = includeTags
    ? sql<TransactionTagJson[]>`
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
      `
    : sql<TransactionTagJson[]>`'[]'::json`;

  const baseSelect = {
    transaction: {
      id: transactions.id,
      date: transactions.date,
      description: transactions.description,
      paymentReference: transactions.paymentReference,
      type: transactions.type,
      status: transactions.status,
      amount: transactions.amount,
      categorySlug: transactions.categorySlug,
      paymentMethod: transactions.paymentMethod,
      excludeFromAnalytics: transactions.excludeFromAnalytics,
      enrichmentCompleted: transactions.enrichmentCompleted,
      manual: transactions.manual,
      currency: transactions.currency,
      transactionNumber: transactions.transactionNumber,
    },
    client: { id: clients.id, name: clients.name },
    category: { id: transactionCategories.id, name: transactionCategories.name, slug: transactionCategories.slug },
    assignedUser: { id: users.id, fullName: users.fullName, email: users.email },
    tags: tagSelect,
  } as const;

  const baseFrom = db
    .select(baseSelect)
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug),
      ),
    )
    .leftJoin(users, eq(transactions.assignedId, users.id));

  const queryWithTags = baseFrom
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .where(whereConditions)
    .groupBy(transactions.id, clients.id, transactionCategories.id, users.id)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  const queryNoTags = baseFrom
    .where(whereConditions)
    .groupBy(transactions.id, clients.id, transactionCategories.id, users.id)
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  const results = await (includeTags ? queryWithTags : queryNoTags);
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
  },
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
        eq(transactions.categorySlug, transactionCategories.slug),
      ),
    )
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        sql`fts_vector @@ websearch_to_tsquery('english', ${query})`,
      ),
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
      frequency?:
        | "weekly"
        | "biweekly"
        | "monthly"
        | "semi_monthly"
        | "annually"
        | "irregular"
        | null;
      excludeFromAnalytics?: boolean;
      notes?: string | null;
    };
  },
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
        isNull(transactions.deletedAt),
      ),
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
  },
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
        eq(transactions.manual, true),
        // Ensure not allocated to any invoice
        sql`NOT EXISTS (SELECT 1 FROM transaction_allocations ta WHERE ta.transaction_id = ${transactions.id})`,
      ),
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
  },
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
        eq(transactions.categorySlug, transactionCategories.slug),
      ),
    )
    .leftJoin(users, eq(transactions.assignedId, users.id))
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .leftJoin(transactionAttachments, eq(transactions.id, transactionAttachments.transactionId))
    .where(
      and(
        eq(transactions.teamId, teamId),
        eq(transactions.id, transactionId),
        isNull(transactions.deletedAt),
      ),
    )
    .groupBy(transactions.id, clients.id, transactionCategories.id, users.id)
    .limit(1);

  return result[0];
}

/**
 * Get min/max transaction amounts for a team (for dynamic slider bounds)
 */
export async function getTransactionAmountBounds(
  db: DbClient,
  params: { teamId: string },
) {
  const { teamId } = params;
  const rows = await db
    .select({
      min: sql<number>`MIN(${transactions.amount})`,
      max: sql<number>`MAX(${transactions.amount})`,
    })
    .from(transactions)
    .where(and(eq(transactions.teamId, teamId), isNull(transactions.deletedAt)))
    .limit(1);

  const min = rows[0]?.min ?? 0;
  const max = rows[0]?.max ?? 0;
  return { min, max };
}

/**
 * Get transaction categories (hierarchical)
 */
export async function getTransactionCategories(
  db: DbClient,
  params: {
    teamId: string;
  },
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
  },
) {
  const { teamId } = params;

  return await db.select().from(tags).where(eq(tags.teamId, teamId)).orderBy(tags.name);
}
