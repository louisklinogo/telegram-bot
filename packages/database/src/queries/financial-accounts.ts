import { and, eq, isNull } from "drizzle-orm";
import type { DbClient } from "../client";
import { financialAccounts } from "../schema";

export async function getFinancialAccounts(db: DbClient, params: { teamId: string }) {
  return await db
    .select({
      id: financialAccounts.id,
      type: financialAccounts.type,
      name: financialAccounts.name,
      currency: financialAccounts.currency,
      provider: financialAccounts.provider,
      status: financialAccounts.status,
      openingBalance: financialAccounts.openingBalance,
      createdAt: financialAccounts.createdAt,
    })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.teamId, params.teamId), eq(financialAccounts.status, "active")))
    .orderBy(financialAccounts.name);
}

export async function getFinancialAccountById(
  db: DbClient,
  teamId: string,
  accountId: string,
) {
  const result = await db
    .select({
      id: financialAccounts.id,
      type: financialAccounts.type,
      name: financialAccounts.name,
      currency: financialAccounts.currency,
      provider: financialAccounts.provider,
      externalId: financialAccounts.externalId,
      status: financialAccounts.status,
      openingBalance: financialAccounts.openingBalance,
      createdAt: financialAccounts.createdAt,
      updatedAt: financialAccounts.updatedAt,
    })
    .from(financialAccounts)
    .where(and(eq(financialAccounts.teamId, teamId), eq(financialAccounts.id, accountId)))
    .limit(1);
  return result[0] || null;
}

export async function createFinancialAccount(
  db: DbClient,
  params: {
    teamId: string;
    type: string;
    name: string;
    currency?: string;
    provider?: string;
    externalId?: string;
    openingBalance?: string;
  },
) {
  const [result] = await db
    .insert(financialAccounts)
    .values({
      teamId: params.teamId,
      type: params.type as any,
      name: params.name,
      currency: params.currency || undefined,
      provider: params.provider || null,
      externalId: params.externalId || null,
      openingBalance: params.openingBalance || null,
      status: "active",
    })
    .returning({
      id: financialAccounts.id,
      type: financialAccounts.type,
      name: financialAccounts.name,
      currency: financialAccounts.currency,
      provider: financialAccounts.provider,
      status: financialAccounts.status,
      openingBalance: financialAccounts.openingBalance,
      createdAt: financialAccounts.createdAt,
    });
  return result;
}

export async function updateFinancialAccount(
  db: DbClient,
  teamId: string,
  params: {
    id: string;
    name?: string;
    status?: string;
    openingBalance?: string | null;
  },
) {
  const [result] = await db
    .update(financialAccounts)
    .set({
      name: params.name,
      status: params.status as any,
      openingBalance: params.openingBalance,
    })
    .where(and(eq(financialAccounts.teamId, teamId), eq(financialAccounts.id, params.id)))
    .returning({
      id: financialAccounts.id,
      type: financialAccounts.type,
      name: financialAccounts.name,
      currency: financialAccounts.currency,
      provider: financialAccounts.provider,
      status: financialAccounts.status,
      openingBalance: financialAccounts.openingBalance,
      updatedAt: financialAccounts.updatedAt,
    });
  return result;
}
