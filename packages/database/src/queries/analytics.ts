import { eq, and, isNull, desc, sql, gte } from "drizzle-orm";
import type { DbClient } from "../client";
import { clients, orders } from "../schema";

/**
 * Get most active client (by order count in last 30 days)
 */
export async function getMostActiveClient(db: DbClient, teamId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .select({
      clientId: orders.clientId,
      clientName: clients.name,
      orderCount: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .innerJoin(clients, eq(orders.clientId, clients.id))
    .where(
      and(
        eq(orders.teamId, teamId),
        isNull(orders.deletedAt),
        gte(orders.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(orders.clientId, clients.name)
    .orderBy(desc(sql`count(${orders.id})`))
    .limit(1);

  return result[0] || null;
}

/**
 * Get count of inactive clients (no orders in last 30 days)
 */
export async function getInactiveClientsCount(db: DbClient, teamId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  // Get all clients
  const allClients = await db
    .select({ id: clients.id })
    .from(clients)
    .where(and(eq(clients.teamId, teamId), isNull(clients.deletedAt)));

  // Get clients with recent orders
  const activeClients = await db
    .select({ clientId: orders.clientId })
    .from(orders)
    .where(
      and(
        eq(orders.teamId, teamId),
        isNull(orders.deletedAt),
        gte(orders.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(orders.clientId);

  const activeClientIds = new Set(activeClients.map((c) => c.clientId));
  const inactiveCount = allClients.filter((c) => !activeClientIds.has(c.id)).length;

  return inactiveCount;
}

/**
 * Get top revenue client (by total order value in last 30 days)
 */
export async function getTopRevenueClient(db: DbClient, teamId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const result = await db
    .select({
      clientId: orders.clientId,
      clientName: clients.name,
      totalRevenue: sql<number>`sum(${orders.totalPrice})::numeric`,
      orderCount: sql<number>`count(${orders.id})::int`,
    })
    .from(orders)
    .innerJoin(clients, eq(orders.clientId, clients.id))
    .where(
      and(
        eq(orders.teamId, teamId),
        isNull(orders.deletedAt),
        gte(orders.createdAt, thirtyDaysAgo),
      ),
    )
    .groupBy(orders.clientId, clients.name)
    .orderBy(desc(sql`sum(${orders.totalPrice})`))
    .limit(1);

  return result[0] || null;
}

/**
 * Get count of new clients in current month
 */
export async function getNewClientsThisMonth(db: DbClient, teamId: string) {
  const now = new Date();
  const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);

  const result = await db
    .select({
      count: sql<number>`count(*)::int`,
    })
    .from(clients)
    .where(
      and(
        eq(clients.teamId, teamId),
        isNull(clients.deletedAt),
        gte(clients.createdAt, startOfMonth),
      ),
    );

  return result[0]?.count || 0;
}
