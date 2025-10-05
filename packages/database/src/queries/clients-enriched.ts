import { eq, and, isNull, desc, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import { clients, orders } from "../schema";

/**
 * Get enriched clients with aggregated data (orders count, revenue, last order date)
 */
export async function getEnrichedClients(
  db: DbClient,
  params: {
    teamId: string;
    search?: string;
    limit?: number;
    cursor?: string;
  },
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
      sql`(
        ${clients.name} ILIKE ${'%' + search + '%'} OR 
        ${clients.email} ILIKE ${'%' + search + '%'} OR 
        ${clients.phone} ILIKE ${'%' + search + '%'} OR 
        ${clients.whatsapp} ILIKE ${'%' + search + '%'}
      )`,
    );
  }

  // Get clients with aggregated order data
  const result = await db
    .select({
      id: clients.id,
      teamId: clients.teamId,
      name: clients.name,
      phone: clients.phone,
      whatsapp: clients.whatsapp,
      email: clients.email,
      address: clients.address,
      country: clients.country,
      countryCode: clients.countryCode,
      company: clients.company,
      occupation: clients.occupation,
      referralSource: clients.referralSource,
      tags: clients.tags,
      notes: clients.notes,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      deletedAt: clients.deletedAt,
      // Aggregated data from orders
      ordersCount: sql<number>`
        COALESCE(
          (SELECT COUNT(*)::int 
           FROM ${orders} 
           WHERE ${orders.clientId} = ${clients.id} 
           AND ${orders.deletedAt} IS NULL),
          0
        )
      `,
      totalRevenue: sql<string>`
        COALESCE(
          (SELECT SUM(${orders.totalPrice})::text
           FROM ${orders} 
           WHERE ${orders.clientId} = ${clients.id} 
           AND ${orders.deletedAt} IS NULL),
          '0'
        )
      `,
      lastOrderDate: sql<Date | null>`
        (SELECT MAX(${orders.createdAt})
         FROM ${orders} 
         WHERE ${orders.clientId} = ${clients.id} 
         AND ${orders.deletedAt} IS NULL)
      `,
    })
    .from(clients)
    .where(and(...conditions))
    .orderBy(desc(clients.createdAt))
    .limit(limit);

  return result;
}

/**
 * Get enriched client by ID with aggregated data
 */
export async function getEnrichedClientById(
  db: DbClient,
  id: string,
  teamId: string,
) {
  const result = await db
    .select({
      id: clients.id,
      teamId: clients.teamId,
      name: clients.name,
      phone: clients.phone,
      whatsapp: clients.whatsapp,
      email: clients.email,
      address: clients.address,
      country: clients.country,
      countryCode: clients.countryCode,
      company: clients.company,
      occupation: clients.occupation,
      referralSource: clients.referralSource,
      tags: clients.tags,
      notes: clients.notes,
      createdAt: clients.createdAt,
      updatedAt: clients.updatedAt,
      deletedAt: clients.deletedAt,
      // Aggregated data
      ordersCount: sql<number>`
        COALESCE(
          (SELECT COUNT(*)::int 
           FROM ${orders} 
           WHERE ${orders.clientId} = ${clients.id} 
           AND ${orders.deletedAt} IS NULL),
          0
        )
      `,
      totalRevenue: sql<string>`
        COALESCE(
          (SELECT SUM(${orders.totalPrice})::text
           FROM ${orders} 
           WHERE ${orders.clientId} = ${clients.id} 
           AND ${orders.deletedAt} IS NULL),
          '0'
        )
      `,
      lastOrderDate: sql<Date | null>`
        (SELECT MAX(${orders.createdAt})
         FROM ${orders} 
         WHERE ${orders.clientId} = ${clients.id} 
         AND ${orders.deletedAt} IS NULL)
      `,
    })
    .from(clients)
    .where(
      and(
        eq(clients.id, id),
        eq(clients.teamId, teamId),
        isNull(clients.deletedAt)
      )
    )
    .limit(1);

  return result[0] || null;
}
