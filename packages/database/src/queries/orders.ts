import { eq, and, isNull, desc, lt, or } from "drizzle-orm";
import { sql } from "drizzle-orm";
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
    cursor?: { createdAt: Date | string | null; id: string } | null;
  },
) {
  const { teamId, limit = 50, cursor } = params;

  const baseWhere = and(eq(orders.teamId, teamId), isNull(orders.deletedAt));

  const cursorDate =
    cursor?.createdAt instanceof Date
      ? cursor.createdAt
      : cursor?.createdAt
        ? new Date(cursor.createdAt)
        : null;

  return await db
    .select({
      order: orders,
      client: clients,
    })
    .from(orders)
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(
      cursorDate && cursor
        ? and(
            baseWhere,
            or(
              lt(orders.createdAt, cursorDate),
              and(eq(orders.createdAt, cursorDate), lt(orders.id, cursor.id)),
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
    const IS_DEV = process.env.NODE_ENV !== "production";

    // Create order first
    const [created] = await tx.insert(orders).values(data).returning();
    
    if (!created?.id) {
      throw new Error("Failed to create order - no ID returned");
    }
    
    if (IS_DEV) console.log("Created order with ID:", created.id);
    
    // Create order items if any
    if (items.length > 0) {
      if (IS_DEV) {
        console.log("Creating order items for order:", created.id);
        console.log("Items to create:", JSON.stringify(items, null, 2));
      }
      
      try {
        // Map items to proper format for bulk insert
        const itemsToInsert = items.map((item, index) => {
          if (IS_DEV) console.log(`Mapping item ${index + 1}:`, item);
          const unit = Number(item.unit_cost);
          const qty = Number(item.quantity);
          const total = qty * unit;
          return {
            orderId: created.id,
            name: item.name,
            quantity: item.quantity,
            unitPrice: unit.toFixed(2), // derive from unit_cost
            total: total.toFixed(2),     // server-side compute
          };
        });
        
        if (IS_DEV) console.log("Bulk inserting items:", JSON.stringify(itemsToInsert, null, 2));
        
        // Bulk insert all items at once
        const insertedItems = await tx.insert(orderItems).values(itemsToInsert).returning();
        
        if (IS_DEV) console.log("✅ Successfully created", insertedItems.length, "order items:", insertedItems.map(i => ({ id: i.id, name: i.name })));
        
        if (insertedItems.length !== items.length) {
          throw new Error(`Expected ${items.length} items to be created, but only ${insertedItems.length} were returned`);
        }
      } catch (itemError) {
        const e: any = itemError;
        if (IS_DEV) {
          console.error("Failed to insert order items. Postgres error:", {
            message: e?.message,
            code: e?.code,
            detail: e?.detail,
            hint: e?.hint,
            table: e?.table,
            schema: e?.schema,
            column: e?.column,
            constraint: e?.constraint,
          });
          console.error("Original items data:", items);
        }
        throw itemError;
      }
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
        const IS_DEV = process.env.NODE_ENV !== "production";
        const itemsToInsert = items.map((it) => {
          const unit = Number(it.unit_cost);
          const qty = Number(it.quantity);
          const total = qty * unit;
          return {
            orderId: id,
            name: it.name,
            quantity: it.quantity,
            unitPrice: unit.toFixed(2),
            total: total.toFixed(2),
          };
        });
        try {
          await tx.insert(orderItems).values(itemsToInsert);
        } catch (err) {
          const e: any = err;
          if (IS_DEV) {
            console.error("Failed to insert order items on update. Postgres error:", {
              message: e?.message,
              code: e?.code,
              detail: e?.detail,
              hint: e?.hint,
              table: e?.table,
              schema: e?.schema,
              column: e?.column,
              constraint: e?.constraint,
            });
          }
          throw err;
        }
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
