import {
  createClient,
  deleteClient,
  getClientById,
  getClients,
  getEnrichedClientById,
  getEnrichedClients,
  updateClient,
} from "@Faworra/database/queries";
import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";

// Validation schemas
const clientInsertSchema = z.object({
  name: z.string().min(1, "Name is required"),
  whatsapp: z.string().min(1, "WhatsApp number is required"),
  phone: z.string().optional().nullable(),
  email: z.string().email().optional().nullable(),
  address: z.string().optional().nullable(),
  country: z.string().optional().nullable(),
  countryCode: z.string().optional().nullable(),
  company: z.string().optional().nullable(),
  occupation: z.string().optional().nullable(),
  referralSource: z.string().optional().nullable(),
  tags: z.array(z.string()).optional().nullable(),
  notes: z.string().optional().nullable(),
});

const clientUpdateSchema = clientInsertSchema.partial().extend({
  id: z.string().uuid(),
});

export const clientsRouter = createTRPCRouter({
  // List all clients for the current team (with cursor-based pagination and enriched data)
  list: teamProcedure
    .input(
      z
        .object({
          search: z.string().optional(),
          limit: z.number().min(1).max(100).default(50),
          cursor: z.string().optional(), // cursor is the last client ID
        })
        .optional()
    )
    .query(async ({ ctx, input }) => {
      const limit = input?.limit ?? 50;

      const clients = await getEnrichedClients(ctx.db, {
        teamId: ctx.teamId,
        search: input?.search,
        limit: limit + 1, // Fetch one extra to determine if there's more
        cursor: input?.cursor,
      });

      let nextCursor: string | undefined;
      if (clients.length > limit) {
        const nextItem = clients.pop(); // Remove the extra item
        nextCursor = nextItem!.id;
      }

      return {
        items: clients,
        nextCursor,
      };
    }),

  // Get a single client by ID
  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getClientById(ctx.db, input.id, ctx.teamId)),

  // Create a new client
  create: teamProcedure.input(clientInsertSchema).mutation(async ({ ctx, input }) =>
    createClient(ctx.db, {
      ...input,
      teamId: ctx.teamId,
    })
  ),

  // Update an existing client
  update: teamProcedure.input(clientUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, ...data } = input;
    return updateClient(ctx.db, id, ctx.teamId, data);
  }),

  // Delete a client (soft delete)
  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => deleteClient(ctx.db, input.id, ctx.teamId)),
});
