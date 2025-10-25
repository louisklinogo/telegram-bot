import { createTag, deleteTag, getTagById, getTags, updateTag } from "@Faworra/database/queries";
import { activities } from "@Faworra/database/schema";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

const createSchema = z.object({
  name: z.string().min(1).max(100),
  color: z.string().nullable().optional(),
});

const updateSchema = createSchema.partial().extend({
  id: z.string().uuid(),
});

export const tagsRouter = createTRPCRouter({
  list: teamProcedure.query(async ({ ctx }) => getTags(ctx.db, { teamId: ctx.teamId })),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getTagById(ctx.db, ctx.teamId, input.id)),

  create: teamProcedure.input(createSchema).mutation(async ({ ctx, input }) => {
    const row = await createTag(ctx.db, {
      teamId: ctx.teamId,
      name: input.name,
      color: input.color || undefined,
    });

    // Activity log
    await ctx.db.insert(activities).values({
      teamId: ctx.teamId,
      userId: ctx.userId,
      type: "tag.create",
      metadata: {
        id: row.id,
        name: row.name,
        color: row.color,
      } as any,
    });

    return row;
  }),

  update: teamProcedure.input(updateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    const row = await updateTag(ctx.db, ctx.teamId, { id, ...data });

    // Activity log
    await ctx.db.insert(activities).values({
      teamId: ctx.teamId,
      userId: ctx.userId,
      type: "tag.update",
      metadata: {
        id: row?.id,
        name: row?.name,
        color: row?.color,
      } as any,
    });

    return row;
  }),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const row = await deleteTag(ctx.db, ctx.teamId, input.id);

      // Activity log
      await ctx.db.insert(activities).values({
        teamId: ctx.teamId,
        userId: ctx.userId,
        type: "tag.delete",
        metadata: {
          id: row?.id,
          name: row?.name,
        } as any,
      });

      return row;
    }),
});
