import { eq, and, desc, lt, or } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  communicationThreads,
  communicationMessages,
  communicationAccounts,
  clients,
} from "../schema";

/**
 * Get all threads for a team with latest message
 */
export async function getThreadsWithLatestMessage(db: DbClient, teamId: string) {
  return await db
    .select({
      thread: communicationThreads,
      account: communicationAccounts,
    })
    .from(communicationThreads)
    .leftJoin(communicationAccounts, eq(communicationThreads.accountId, communicationAccounts.id))
    .where(eq(communicationThreads.teamId, teamId))
    .orderBy(desc(communicationThreads.lastMessageAt));
}

/**
 * Get threads by status with account and optional linked client info
 */
export async function getThreadsByStatus(
  db: DbClient,
  params: {
    teamId: string;
    status: string;
    limit?: number;
    cursor?: { lastMessageAt: Date | null; id: string } | null;
  },
) {
  const { teamId, status, limit = 50, cursor } = params;

  const baseWhere = and(
    eq(communicationThreads.teamId, teamId),
    eq(communicationThreads.status, status),
  );

  const rows = await db
    .select({
      thread: communicationThreads,
      account: communicationAccounts,
      client: clients,
    })
    .from(communicationThreads)
    .leftJoin(communicationAccounts, eq(communicationThreads.accountId, communicationAccounts.id))
    .leftJoin(clients, eq(communicationThreads.customerId, clients.id))
    .where(
      cursor?.lastMessageAt
        ? and(
            baseWhere,
            or(
              // Strictly older lastMessageAt
              lt(communicationThreads.lastMessageAt, cursor.lastMessageAt),
              // Tie-break on id when same timestamp
              and(
                eq(communicationThreads.lastMessageAt, cursor.lastMessageAt),
                lt(communicationThreads.id, cursor.id),
              ),
            ),
          )
        : baseWhere,
    )
    .orderBy(desc(communicationThreads.lastMessageAt), desc(communicationThreads.id))
    .limit(limit);

  return rows;
}

/**
 * Get messages for a thread
 */
export async function getThreadMessages(
  db: DbClient,
  threadId: string,
  teamId: string,
  limit = 100,
) {
  return await db
    .select()
    .from(communicationMessages)
    .where(
      and(eq(communicationMessages.threadId, threadId), eq(communicationMessages.teamId, teamId)),
    )
    .orderBy(desc(communicationMessages.createdAt))
    .limit(limit);
}

/**
 * Create a new message
 */
export async function createMessage(db: DbClient, data: typeof communicationMessages.$inferInsert) {
  const result = await db.insert(communicationMessages).values(data).returning();
  return result[0];
}

/**
 * Get communication accounts for a team
 */
export async function getTeamAccounts(db: DbClient, teamId: string) {
  return await db
    .select()
    .from(communicationAccounts)
    .where(eq(communicationAccounts.teamId, teamId))
    .orderBy(desc(communicationAccounts.createdAt));
}
