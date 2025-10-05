import { eq, and, isNull, desc, lt, or } from "drizzle-orm";
import type { DbClient } from "../client";
import { orders, clients, orderItems } from "../schema";

/**
 * Get all orders for a team with client information
 */
export async function getOrdersWithClients(
  db: DbClient,
  params: {
    teamId: string;
    limit?: number;
    cursor?: { createdAt: Date | null; id: string } | null;
  },
) {
  const { teamId, limit = 50, cursor } = params;

  const baseWhere = and(eq(orders.teamId, teamId), isNull(orders.deletedAt));

  return await db
    .select({
      order: orders,
      client: clients,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(
      cursor?.createdAt
        ? and(
            baseWhere,
            or(
              lt(orders.createdAt, cursor.createdAt),
              and(eq(orders.createdAt, cursor.createdAt), lt(orders.id, cursor.id)),
            ),
          )
        : baseWhere,
    )
    .orderBy(desc(orders.createdAt), desc(orders.id))
    .limit(limit);
}

/**
 * Get a single order by ID
 */
export async function getOrderById(db: DbClient, id: string, teamId: string) {
  const result = await db
    .select({
      order: orders,
      client: clients,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(and(eq(orders.id, id), eq(orders.teamId, teamId), isNull(orders.deletedAt)))
    .limit(1);

  return result[0] || null;
}

/**
 * Get a single order by ID including items
 */
export async function getOrderWithItemsById(db: DbClient, id: string, teamId: string) {
  const base = await getOrderById(db, id, teamId);
  if (!base) return null;
  const items = await db.select().from(orderItems).where(eq(orderItems.orderId, id));
  return { ...base, items } as any;
}

/**
 * Create a new order
 */
export async function createOrder(db: DbClient, data: typeof orders.$inferInsert) {
  const result = await db.insert(orders).values(data).returning();
  return result[0];
}

/**
 * Create a new order and its items atomically
 */
export async function createOrderWithItems(
  db: DbClient,
  data: typeof orders.$inferInsert,
  items: Array<{ name: string; quantity: number; unit_cost: number; total_cost: number }> = [],
) {
  return await db.transaction(async (tx) => {
    const [created] = await tx.insert(orders).values(data).returning();
    if (items.length > 0) {
      await tx.insert(orderItems).values(
        items.map((it) => ({
          orderId: created.id,
          name: it.name,
          quantity: it.quantity,
          unitPrice: String(it.unit_cost) as any,
          total: String(it.total_cost) as any,
        })) as any,
      );
    }
    return created;
  });
}

/**
 * Update an order
 */
export async function updateOrder(
  db: DbClient,
  id: string,
  teamId: string,
  data: Partial<typeof orders.$inferInsert>,
) {
  const result = await db
    .update(orders)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.teamId, teamId)))
    .returning();

  return result[0] || null;
}

/**
 * Update order and replace items atomically
 */
export async function updateOrderWithItems(
  db: DbClient,
  id: string,
  teamId: string,
  data: Partial<typeof orders.$inferInsert>,
  items?: Array<{ name: string; quantity: number; unit_cost: number; total_cost: number }>,
) {
  return await db.transaction(async (tx) => {
    const [updated] = await tx
      .update(orders)
      .set({ ...data, updatedAt: new Date() })
      .where(and(eq(orders.id, id), eq(orders.teamId, teamId)))
      .returning();
    if (!updated) return null;
    if (items) {
      await tx.delete(orderItems).where(eq(orderItems.orderId, id));
      if (items.length > 0) {
        await tx.insert(orderItems).values(
          items.map((it) => ({
            orderId: id,
            name: it.name,
            quantity: it.quantity,
            unitPrice: String(it.unit_cost) as any,
            total: String(it.total_cost) as any,
          })) as any,
        );
      }
    }
    return updated;
  });
}

/**
 * Soft delete an order (sets deletedAt)
 */
export async function deleteOrder(db: DbClient, id: string, teamId: string) {
  const result = await db
    .update(orders)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(orders.id, id), eq(orders.teamId, teamId)))
    .returning();
  return result[0] || null;
}
