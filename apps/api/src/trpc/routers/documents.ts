import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getDocuments,
  getDocumentById,
  createDocument,
  updateDocument,
  deleteDocument,
  getDocumentStats,
  getAllDocumentTags,
} from "@cimantikos/database/queries";

// Validation schemas
const documentCreateSchema = z.object({
  name: z.string().min(1, "Name is required"),
  pathTokens: z.array(z.string()).min(1, "Path is required"),
  mimeType: z.string().optional(),
  size: z.number().optional(),
  tags: z.array(z.string()).optional(),
  orderId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  metadata: z.record(z.unknown()).optional(),
});

const documentUpdateSchema = z.object({
  id: z.string().uuid(),
  name: z.string().optional(),
  tags: z.array(z.string()).optional(),
  processingStatus: z.enum(["pending", "processing", "completed", "failed"]).optional(),
  metadata: z.record(z.unknown()).optional(),
});

const documentListSchema = z.object({
  q: z.string().optional(), // Search query
  tags: z.array(z.string()).optional(),
  orderId: z.string().uuid().optional(),
  invoiceId: z.string().uuid().optional(),
  clientId: z.string().uuid().optional(),
  start: z.string().optional(), // Start date filter (ISO format)
  end: z.string().optional(), // End date filter (ISO format)
  limit: z.number().min(1).max(100).default(20),
  cursor: z.string().uuid().optional(),
});

export const documentsRouter = createTRPCRouter({
  // List documents with infinite scroll support
  list: teamProcedure
    .input(documentListSchema)
    .query(async ({ ctx, input }) => {
      const result = await getDocuments(ctx.db, {
        teamId: ctx.teamId,
        q: input.q,
        tags: input.tags,
        orderId: input.orderId,
        invoiceId: input.invoiceId,
        clientId: input.clientId,
        start: input.start,
        end: input.end,
        limit: input.limit,
        cursor: input.cursor,
      });

      return {
        items: result.items,
        meta: {
          cursor: result.nextCursor,
          hasMore: result.hasMore,
        },
      };
    }),

  // Get single document by ID
  getById: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      return getDocumentById(ctx.db, {
        id: input.id,
        teamId: ctx.teamId,
      });
    }),

  // Create new document record (after file upload to storage)
  create: teamProcedure
    .input(documentCreateSchema)
    .mutation(async ({ ctx, input }) => {
      return createDocument(ctx.db, {
        ...input,
        teamId: ctx.teamId,
        uploadedBy: ctx.userId,
      });
    }),

  // Update document metadata/tags
  update: teamProcedure
    .input(documentUpdateSchema)
    .mutation(async ({ ctx, input }) => {
      return updateDocument(ctx.db, {
        ...input,
        teamId: ctx.teamId,
      });
    }),

  // Soft delete document
  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return deleteDocument(ctx.db, {
        id: input.id,
        teamId: ctx.teamId,
      });
    }),

  // Get document statistics
  stats: teamProcedure
    .query(async ({ ctx }) => {
      return getDocumentStats(ctx.db, {
        teamId: ctx.teamId,
      });
    }),

  // Get all tags with usage count
  tags: teamProcedure
    .query(async ({ ctx }) => {
      return getAllDocumentTags(ctx.db, {
        teamId: ctx.teamId,
      });
    }),
});
