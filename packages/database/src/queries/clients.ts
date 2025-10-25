import { and, desc, eq, ilike, isNull, or, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import { clients } from "../schema";

/**
 * Get all clients for a team with optional search and cursor-based pagination
 */
export async function getClients(
  db: DbClient,
  params: {
    teamId: string;
    search?: string;
    limit?: number;
    cursor?: string;
  }
) {
  const { teamId, search, limit = 50, cursor } = params;

  const conditions = [eq(clients.teamId, teamId), isNull(clients.deletedAt)];

  // Add cursor condition for pagination
  if (cursor) {
    conditions.push(sql`${clients.id} < ${cursor}`);
  }

  // Add search conditions
  if (search) {
    conditions.push(
      or(
        ilike(clients.name, `%${search}%`),
        ilike(clients.email, `%${search}%`),
        ilike(clients.phone, `%${search}%`),
        ilike(clients.whatsapp, `%${search}%`)
      )!
    );
  }

  const query = db
    .select()
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.createdAt))
    .limit(limit);

  return await query;
}

/**
 * Get a single client by ID
 */
export async function getClientById(db: DbClient, id: string, teamId: string) {
  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.id, id), eq(clients.teamId, teamId), isNull(clients.deletedAt)))
    .limit(1);

  return result[0] || null;
}

/**
 * Create a new client
 */
export async function createClient(db: DbClient, data: typeof clients.$inferInsert) {
  const result = await db.insert(clients).values(data).returning();
  return result[0];
}

/**
 * Update a client
 */
export async function updateClient(
  db: DbClient,
  id: string,
  teamId: string,
  data: Partial<typeof clients.$inferInsert>
) {
  const result = await db
    .update(clients)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.teamId, teamId)))
    .returning();

  return result[0] || null;
}

/**
 * Soft delete a client
 */
export async function deleteClient(db: DbClient, id: string, teamId: string) {
  const result = await db
    .update(clients)
    .set({ deletedAt: new Date() })
    .where(and(eq(clients.id, id), eq(clients.teamId, teamId)))
    .returning();

  return result[0] || null;
}

/**
 * Get client count for a team
 */
export async function getClientCount(db: DbClient, teamId: string) {
  const result = await db
    .select()
    .from(clients)
    .where(and(eq(clients.teamId, teamId), isNull(clients.deletedAt)));

  return result.length;
}
