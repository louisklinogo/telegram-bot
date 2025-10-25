import { and, eq, isNull } from "drizzle-orm";
import type { DbClient } from "../client";
import { tags } from "../schema";

export async function getTags(db: DbClient, params: { teamId: string }) {
  return await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .where(eq(tags.teamId, params.teamId))
    .orderBy(tags.name);
}

export async function getTagById(db: DbClient, teamId: string, tagId: string) {
  const result = await db
    .select({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    })
    .from(tags)
    .where(and(eq(tags.teamId, teamId), eq(tags.id, tagId)))
    .limit(1);
  return result[0] || null;
}

export async function createTag(
  db: DbClient,
  params: {
    teamId: string;
    name: string;
    color?: string;
  }
) {
  const [result] = await db
    .insert(tags)
    .values({
      teamId: params.teamId,
      name: params.name,
      color: params.color || null,
    })
    .returning({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    });
  return result;
}

export async function updateTag(
  db: DbClient,
  teamId: string,
  params: {
    id: string;
    name?: string;
    color?: string | null;
  }
) {
  const [result] = await db
    .update(tags)
    .set({
      name: params.name,
      color: params.color,
    })
    .where(and(eq(tags.teamId, teamId), eq(tags.id, params.id)))
    .returning({
      id: tags.id,
      name: tags.name,
      color: tags.color,
      createdAt: tags.createdAt,
    });
  return result;
}

export async function deleteTag(db: DbClient, teamId: string, tagId: string) {
  const [result] = await db
    .delete(tags)
    .where(and(eq(tags.teamId, teamId), eq(tags.id, tagId)))
    .returning({
      id: tags.id,
      name: tags.name,
      color: tags.color,
    });
  return result;
}
