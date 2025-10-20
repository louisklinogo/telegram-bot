import { eq, and, isNull, desc, sql, gte, ne } from "drizzle-orm";
import type { DbClient } from "../client";
import { clients, orders, teamDailyOrdersSummary } from "../schema";

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

/**
 * Get highest value order (with client info)
 */
export async function getHighestValueOrder(db: DbClient, teamId: string) {
  const result = await db
    .select({
      id: orders.id,
      orderNumber: orders.orderNumber,
      totalPrice: orders.totalPrice,
      clientId: orders.clientId,
      clientName: clients.name,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(and(eq(orders.teamId, teamId), isNull(orders.deletedAt)))
    .orderBy(desc(orders.totalPrice))
    .limit(1);

  return result[0] || null;
}

/**
 * Get count of completed orders in last 30 days
 */
export async function getCompletedOrdersThisMonth(db: DbClient, teamId: string) {
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  // Ensure we pass a date-only value compatible with DATE column
  const sinceDate = thirtyDaysAgo.toISOString().slice(0, 10);

  const result = await db
    .select({
      count: sql<number>`COALESCE(sum(${teamDailyOrdersSummary.completedCount}), 0)::int`,
    })
    .from(teamDailyOrdersSummary)
    .where(
      and(
        eq(teamDailyOrdersSummary.teamId, teamId),
        gte(teamDailyOrdersSummary.day, sql`(now() - interval '30 days')::date`),
      ),
    );

  return result[0]?.count || 0;
}

/**
 * Get count of pending orders (not completed and not cancelled)
 */
export async function getPendingOrdersCount(db: DbClient, teamId: string) {
  const result = await db
    .select({
      pending: sql<number>`GREATEST(COALESCE(sum(${teamDailyOrdersSummary.createdCountExclCancelled}),0) - COALESCE(sum(${teamDailyOrdersSummary.completedCount}),0), 0)::int`,
    })
    .from(teamDailyOrdersSummary)
    .where(eq(teamDailyOrdersSummary.teamId, teamId));

  return result[0]?.pending || 0;
}

/**
 * Get average order value (excluding cancelled orders)
 */
export async function getAverageOrderValue(db: DbClient, teamId: string) {
  const result = await db
    .select({
      sum: sql<number>`COALESCE(sum(${teamDailyOrdersSummary.createdValueSumExclCancelled}),0)::numeric`,
      cnt: sql<number>`COALESCE(sum(${teamDailyOrdersSummary.createdCountExclCancelled}),0)::int`,
    })
    .from(teamDailyOrdersSummary)
    .where(eq(teamDailyOrdersSummary.teamId, teamId));

  const sum = Number(result[0]?.sum || 0);
  const cnt = Number(result[0]?.cnt || 0);
  const avg = cnt > 0 ? sum / cnt : 0;
  return avg.toFixed(2);
}
