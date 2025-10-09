import { and, desc, eq, isNull, lt, or, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  invoices,
  invoiceItems,
  orders,
  clients,
  orderItems,
  transactionAllocations,
} from "../schema";

export async function getInvoicesWithOrder(
  db: DbClient,
  params: {
    teamId: string;
    limit?: number;
    cursor?: { createdAt: Date | null; id: string } | null;
  },
) {
  const { teamId, limit = 50, cursor } = params;

  const baseWhere = and(eq(invoices.teamId, teamId), isNull(invoices.deletedAt));

  return await db
    .select({ invoice: invoices, order: orders, client: clients })
    .from(invoices)
    .leftJoin(orders, eq(invoices.orderId, orders.id))
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(
      cursor?.createdAt
        ? and(
            baseWhere,
            or(
              lt(invoices.createdAt, cursor.createdAt),
              and(eq(invoices.createdAt, cursor.createdAt), lt(invoices.id, cursor.id)),
            ),
          )
        : baseWhere,
    )
    .orderBy(desc(invoices.createdAt), desc(invoices.id))
    .limit(limit);
}

export async function getInvoiceById(db: DbClient, id: string, teamId: string) {
  const rows = await db
    .select({ invoice: invoices, order: orders, client: clients })
    .from(invoices)
    .leftJoin(orders, eq(invoices.orderId, orders.id))
    .leftJoin(clients, eq(orders.clientId, clients.id))
    .where(and(eq(invoices.id, id), eq(invoices.teamId, teamId), isNull(invoices.deletedAt)))
    .limit(1);
  return rows[0] || null;
}

/**
 * Get invoice with line items
 */
export async function getInvoiceWithItems(db: DbClient, id: string, teamId: string) {
  // Get invoice with order and client
  const invoice = await getInvoiceById(db, id, teamId);
  if (!invoice) return null;

  // Get invoice items
  const items = await db
    .select()
    .from(invoiceItems)
    .where(eq(invoiceItems.invoiceId, id))
    .orderBy(invoiceItems.createdAt);

  // Calculate amount paid from transaction allocations
  const allocationsResult = await db
    .select({ total: sql<string>`COALESCE(SUM(${transactionAllocations.amount}), 0)` })
    .from(transactionAllocations)
    .where(eq(transactionAllocations.invoiceId, id));

  const amountPaid = Number.parseFloat(allocationsResult[0]?.total || "0");
  const amountDue = Number.parseFloat(String(invoice.invoice.amount)) - amountPaid;

  return {
    ...invoice,
    items,
    amountPaid,
    amountDue,
  };
}

/**
 * Generate next invoice number for team
 */
export async function getNextInvoiceNumber(db: DbClient, teamId: string): Promise<string> {
  const result = await db
    .select({ invoiceNumber: invoices.invoiceNumber })
    .from(invoices)
    .where(and(eq(invoices.teamId, teamId), isNull(invoices.deletedAt)))
    .orderBy(desc(invoices.createdAt))
    .limit(1);

  if (!result[0]) {
    return "INV-001";
  }

  // Extract number from invoice number (e.g., "INV-001" -> 1)
  const lastNumber = result[0].invoiceNumber;
  const match = lastNumber.match(/(\d+)$/);

  if (match) {
    const num = Number.parseInt(match[1], 10) + 1;
    return `INV-${String(num).padStart(3, "0")}`;
  }

  // Fallback
  return `INV-${String(result.length + 1).padStart(3, "0")}`;
}

/**
 * Create invoice (without items - use createInvoiceWithItems for full creation)
 */
export async function createInvoice(db: DbClient, data: typeof invoices.$inferInsert) {
  const res = await db.insert(invoices).values(data).returning();
  return res[0];
}

/**
 * Create invoice with line items (from order or manual)
 */
export async function createInvoiceWithItems(
  db: DbClient,
  invoice: typeof invoices.$inferInsert,
  items: Array<{
    name: string;
    quantity: number;
    unitPrice: string | number;
    total: string | number;
    orderItemId?: string;
  }>,
) {
  // Create invoice
  const [newInvoice] = await db.insert(invoices).values(invoice).returning();

  // Create invoice items
  const invoiceItemsData = items.map((item) => ({
    invoiceId: newInvoice.id,
    orderItemId: item.orderItemId || null,
    name: item.name,
    quantity: item.quantity,
    unitPrice: String(item.unitPrice),
    total: String(item.total),
  }));

  await db.insert(invoiceItems).values(invoiceItemsData);

  return newInvoice;
}

/**
 * Update invoice with items (only if draft)
 */
export async function updateInvoiceWithItems(
  db: DbClient,
  id: string,
  teamId: string,
  invoice: Partial<typeof invoices.$inferInsert>,
  items?: Array<{
    name: string;
    quantity: number;
    unitPrice: string | number;
    total: string | number;
  }>,
) {
  // Check if invoice is still editable (draft)
  const existing = await getInvoiceById(db, id, teamId);
  if (!existing || existing.invoice.status !== "draft") {
    throw new Error("Can only update draft invoices");
  }

  // Update invoice
  const [updated] = await db
    .update(invoices)
    .set({ ...invoice, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.teamId, teamId)))
    .returning();

  // Update items if provided
  if (items) {
    // Delete existing items
    await db.delete(invoiceItems).where(eq(invoiceItems.invoiceId, id));

    // Insert new items
    const invoiceItemsData = items.map((item) => ({
      invoiceId: id,
      name: item.name,
      quantity: item.quantity,
      unitPrice: String(item.unitPrice),
      total: String(item.total),
    }));

    await db.insert(invoiceItems).values(invoiceItemsData);
  }

  return updated;
}

export async function updateInvoice(
  db: DbClient,
  id: string,
  teamId: string,
  data: Partial<typeof invoices.$inferInsert>,
) {
  const res = await db
    .update(invoices)
    .set({ ...data, updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.teamId, teamId)))
    .returning();
  return res[0] || null;
}

export async function updateInvoiceStatus(
  db: DbClient,
  id: string,
  teamId: string,
  status: string,
  paidAt?: Date | null,
) {
  const patch: Partial<typeof invoices.$inferInsert> = { status } as any;
  if (status === "paid" && paidAt) (patch as any).paidAt = paidAt;
  return updateInvoice(db, id, teamId, patch);
}

export async function deleteInvoice(db: DbClient, id: string, teamId: string) {
  const res = await db
    .update(invoices)
    .set({ deletedAt: new Date(), updatedAt: new Date() })
    .where(and(eq(invoices.id, id), eq(invoices.teamId, teamId)))
    .returning();
  return res[0] || null;
}
