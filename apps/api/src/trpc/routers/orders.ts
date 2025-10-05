import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getOrdersWithClients,
  getOrderWithItemsById,
  createOrderWithItems,
  updateOrderWithItems,
  deleteOrder,
} from "@cimantikos/database/queries";

// Validation schemas
const orderItemSchema = z.object({
  name: z.string().min(1),
  quantity: z.number().int().min(1),
  unit_cost: z.number().min(0),
  total_cost: z.number().min(0),
});

const orderInsertSchema = z.object({
  clientId: z.string().uuid().nullable(),
  orderNumber: z.string().min(1, "Order number is required"),
  status: z.enum(["generated", "in_progress", "completed", "cancelled"]).default("generated"),
  items: z.array(orderItemSchema).default([]),
  totalPrice: z.number().min(0).default(0),
  depositAmount: z.number().min(0).default(0),
  balanceAmount: z.number().min(0).default(0),
  notes: z.string().optional().nullable(),
  dueDate: z.string().datetime().optional().nullable(),
});

const orderUpdateSchema = orderInsertSchema.partial().extend({
  id: z.string().uuid(),
});

export const ordersRouter = createTRPCRouter({
  // List all orders for the current team
  list: teamProcedure
    .input(
      z
        .object({
          limit: z.number().min(1).max(100).default(50),
          cursor: z.object({ createdAt: z.string().nullable(), id: z.string() }).nullish(),
        })
        .optional(),
    )
    .query(async ({ ctx, input }) => {
      const rows = await getOrdersWithClients(ctx.db, {
        teamId: ctx.teamId,
        limit: input?.limit,
        cursor: input?.cursor
          ? {
              createdAt: input.cursor.createdAt ? new Date(input.cursor.createdAt) : null,
              id: input.cursor.id,
            }
          : null,
      });
      const items = rows;
      const last = items.at(-1) as any | undefined;
      const nextCursor = last
        ? {
            createdAt: last?.order?.createdAt ? new Date(last.order.createdAt).toISOString() : null,
            id: last?.order?.id,
          }
        : null;
      return { items, nextCursor };
    }),

  // Get a single order by ID
  byId: teamProcedure.input(z.object({ id: z.string().uuid() })).query(async ({ ctx, input }) => {
    return getOrderWithItemsById(ctx.db, input.id, ctx.teamId);
  }),

  // Create a new order
  create: teamProcedure.input(orderInsertSchema).mutation(async ({ ctx, input }) => {
    const { items, ...rest } = input as any;
    return createOrderWithItems(ctx.db, { ...rest, teamId: ctx.teamId }, items || []);
  }),

  // Update an existing order
  update: teamProcedure.input(orderUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, items, ...rest } = input as any;
    return updateOrderWithItems(ctx.db, id, ctx.teamId, rest, items);
  }),

  // Delete (soft delete)
  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteOrder(ctx.db, input.id, ctx.teamId);
      return { id: res?.id ?? input.id };
    }),
});
