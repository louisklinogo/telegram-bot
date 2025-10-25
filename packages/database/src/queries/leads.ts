import { and, desc, eq, gte, lt, or, sql } from "drizzle-orm";
import type { DbClient } from "../client";
import {
  clients,
  communicationAccounts,
  communicationMessages,
  communicationThreads,
  instagramContacts,
  leads,
  whatsappContacts,
} from "../schema";

type Platform = "whatsapp" | "instagram" | "email" | "telegram";

export type LeadRow = typeof leads.$inferSelect;
export type LeadInsert = typeof leads.$inferInsert;

function classifyQualification(score: number): "hot" | "warm" | "cold" {
  if (score >= 70) return "hot";
  if (score >= 40) return "warm";
  return "cold";
}

function platformWeight(p: Platform): number {
  switch (p) {
    case "whatsapp":
      return 100;
    case "instagram":
      return 70;
    case "telegram":
      return 60;
    case "email":
    default:
      return 50;
  }
}

function calculateScore(
  messageCount: number,
  platform: Platform,
  lastDate: Date | null,
  manual = 0
) {
  const engagement = Math.min(messageCount * 10, 100);
  const pScore = platformWeight(platform);
  let recency = 0;
  if (lastDate) {
    const days = (Date.now() - lastDate.getTime()) / (1000 * 60 * 60 * 24);
    recency = Math.max(100 - days * 5, 0);
  }
  const m = Math.min(manual, 100);
  const total = Math.round(engagement * 0.3 + pScore * 0.25 + recency * 0.25 + m * 0.2);
  return { total, engagement: Math.round(engagement), pScore, recency: Math.round(recency) };
}

export async function createLeadFromThread(
  db: DbClient,
  params: {
    teamId: string;
    threadId: string;
    ownerUserId?: string | null;
    manualScore?: number;
    notes?: string;
  }
) {
  const { teamId, threadId, ownerUserId, manualScore = 0, notes } = params;

  // Avoid duplicates for the same team+thread
  const existing = await db.query.leads.findFirst({
    where: (t, { and, eq }) => and(eq(t.teamId, teamId), eq(t.threadId, threadId)),
  });
  if (existing) return existing;

  // Get thread and account/channel to derive source
  const row = await db
    .select({
      thread: communicationThreads,
      account: communicationAccounts,
      client: clients,
      wac: whatsappContacts,
      igc: instagramContacts,
    })
    .from(communicationThreads)
    .leftJoin(communicationAccounts, eq(communicationThreads.accountId, communicationAccounts.id))
    .leftJoin(clients, eq(communicationThreads.customerId, clients.id))
    .leftJoin(whatsappContacts, eq(communicationThreads.whatsappContactId, whatsappContacts.id))
    .leftJoin(instagramContacts, eq(communicationThreads.instagramContactId, instagramContacts.id))
    .where(and(eq(communicationThreads.id, threadId), eq(communicationThreads.teamId, teamId)))
    .limit(1);
  const t = row[0]?.thread;
  const acc = row[0]?.account;
  const c = row[0]?.client as any;
  const w = row[0]?.wac as any;
  const i = row[0]?.igc as any;
  if (!t) throw new Error("Thread not found or not in team");

  const platform: Platform =
    (t.channel as Platform) || (acc?.provider?.startsWith("whatsapp") ? "whatsapp" : "instagram");

  // Count last-7d messages for engagement
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(communicationMessages)
    .where(
      and(
        eq(communicationMessages.teamId, teamId),
        eq(communicationMessages.threadId, threadId),
        gte(communicationMessages.createdAt, sevenDaysAgo)
      )
    );
  const messageCount = countRows[0]?.c ?? 0;

  const lastInteractionAt = t.lastMessageAt ?? null;
  const { total: score } = calculateScore(messageCount, platform, lastInteractionAt, manualScore);
  const q = classifyQualification(score);

  const [inserted] = await db
    .insert(leads)
    .values({
      teamId,
      threadId,
      customerId: t.customerId ?? null,
      prospectName:
        (c?.name as string) ??
        (w?.displayName as string) ??
        (i?.displayName as string) ??
        (t.externalContactId as string),
      prospectPhone:
        (c?.whatsapp as string) ?? (c?.phone as string) ?? (w?.phone as string) ?? null,
      prospectHandle: (i?.username as string) ?? null,
      whatsappContactId: (w?.id as string) ?? null,
      instagramContactId: (i?.id as string) ?? null,
      ownerUserId: ownerUserId ?? null,
      source: platform,
      status: "new",
      score,
      qualification: q,
      messageCount,
      lastInteractionAt,
      notes: notes ?? null,
    })
    .returning();

  return inserted;
}

export async function getLeadByThread(db: DbClient, params: { teamId: string; threadId: string }) {
  const { teamId, threadId } = params;
  const row = await db.query.leads.findFirst({
    where: (t, { and, eq }) => and(eq(t.teamId, teamId), eq(t.threadId, threadId)),
  });
  return row ?? null;
}

export async function getLead(db: DbClient, params: { teamId: string; leadId: string }) {
  const { teamId, leadId } = params;
  const row = await db.query.leads.findFirst({
    where: (t, { and, eq }) => and(eq(t.teamId, teamId), eq(t.id, leadId)),
  });
  return row ?? null;
}

export async function recomputeLeadScore(db: DbClient, params: { teamId: string; leadId: string }) {
  const { teamId, leadId } = params;
  // Join to read thread
  const joinRow = await db
    .select({ lead: leads, thread: communicationThreads })
    .from(leads)
    .leftJoin(communicationThreads, eq(leads.threadId, communicationThreads.id))
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
    .limit(1);
  const lr = joinRow[0];
  if (!lr) return null;

  const threadId = lr.lead.threadId;
  const lastInteractionAt = lr.thread?.lastMessageAt ?? lr.lead.lastInteractionAt ?? null;
  const platform: Platform = (lr.thread?.channel as Platform) || "whatsapp";

  // Re-count last-7d messages
  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000);
  const countRows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(communicationMessages)
    .where(
      and(
        eq(communicationMessages.teamId, teamId),
        eq(communicationMessages.threadId, threadId!),
        gte(communicationMessages.createdAt, sevenDaysAgo)
      )
    );
  const messageCount = countRows[0]?.c ?? lr.lead.messageCount;

  const { total: score } = calculateScore(messageCount, platform, lastInteractionAt, 0);
  const q = classifyQualification(score);

  const [row] = await db
    .update(leads)
    .set({ score, qualification: q, messageCount, lastInteractionAt, updatedAt: sql`now()` })
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
    .returning();
  return row;
}

export async function listLeads(
  db: DbClient,
  params: {
    teamId: string;
    status?: ("new" | "interested" | "qualified" | "converted" | "lost") | "all";
    minScore?: number;
    limit?: number;
    cursor?: { updatedAt: Date | null; id: string } | null;
  }
) {
  const { teamId, status = "all", minScore, limit = 50, cursor } = params;
  const conditions: any[] = [eq(leads.teamId, teamId)];
  if (status !== "all") conditions.push(eq(leads.status, status as any));
  if (typeof minScore === "number") conditions.push(gte(leads.score, minScore));
  if (cursor && cursor.updatedAt) {
    const updatedAt = cursor.updatedAt as Date;
    conditions.push(
      sql`${leads.updatedAt} < ${updatedAt} OR (${leads.updatedAt} = ${updatedAt} AND ${leads.id} < ${cursor.id})`
    );
  }

  const rows = await db
    .select({ lead: leads })
    .from(leads)
    .where(and(...conditions))
    .orderBy(desc(leads.updatedAt), desc(leads.id))
    .limit(limit);

  const items = rows.map((r) => r.lead);
  const last = items.at(-1) ?? null;
  const nextCursor = last
    ? { updatedAt: last.updatedAt ? new Date(last.updatedAt) : null, id: last.id }
    : null;
  return { items, nextCursor };
}

export async function updateLeadStatus(
  db: DbClient,
  params: {
    teamId: string;
    leadId: string;
    status: "new" | "interested" | "qualified" | "converted" | "lost";
  }
) {
  const { teamId, leadId, status } = params;
  const [row] = await db
    .update(leads)
    .set({ status, updatedAt: sql`now()` })
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
    .returning();
  return row;
}

export async function setLeadClient(
  db: DbClient,
  params: { teamId: string; leadId: string; clientId: string }
) {
  const { teamId, leadId, clientId } = params;
  const [row] = await db
    .update(leads)
    .set({ customerId: clientId, status: "converted", updatedAt: sql`now()` })
    .where(and(eq(leads.id, leadId), eq(leads.teamId, teamId)))
    .returning();

  // If lead is linked to a thread, also set the thread's customer_id for future context
  if (row?.threadId) {
    await db
      .update(communicationThreads)
      .set({ customerId: clientId, updatedAt: sql`now()` })
      .where(
        and(eq(communicationThreads.id, row.threadId), eq(communicationThreads.teamId, teamId))
      );
  }
  return row;
}
