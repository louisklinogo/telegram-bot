import { z } from "zod";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getInvoicesWithOrder,
  getInvoiceById,
  getInvoiceWithItems,
  getNextInvoiceNumber,
  updateInvoiceStatus,
  updateInvoice,
  createInvoice,
  createInvoiceWithItems,
  updateInvoiceWithItems,
  deleteInvoice,
} from "@Faworra/database/queries";
import { getOrderWithItemsById } from "@Faworra/database/queries";

// Validation schemas
const invoiceItemSchema = z.object({
  name: z.string().min(1, "Item name is required"),
  quantity: z.number().int().min(1, "Quantity must be at least 1"),
  unitPrice: z.number().min(0, "Unit price must be positive"),
  total: z.number().min(0, "Total must be positive"),
  orderItemId: z.string().uuid().optional(),
});

const invoiceCreateSchema = z.object({
  orderId: z.string().uuid().nullable().optional(),
  invoiceNumber: z.string().min(1, "Invoice number is required"),
  subtotal: z.number().min(0),
  tax: z.number().min(0).default(0),
  discount: z.number().min(0).default(0),
  amount: z.number().min(0),
  status: z
    .enum(["draft", "sent", "partially_paid", "paid", "overdue", "cancelled"])
    .default("draft"),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(invoiceItemSchema).min(1, "At least one item is required"),
});

const invoiceUpdateSchema = z.object({
  id: z.string().uuid(),
  subtotal: z.number().min(0).optional(),
  tax: z.number().min(0).optional(),
  discount: z.number().min(0).optional(),
  amount: z.number().min(0).optional(),
  dueDate: z.string().datetime().nullable().optional(),
  notes: z.string().nullable().optional(),
  items: z.array(invoiceItemSchema).optional(),
});

export const invoicesRouter = createTRPCRouter({
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
      const rows = await getInvoicesWithOrder(ctx.db, {
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
            createdAt: last?.invoice?.createdAt
              ? new Date(last.invoice.createdAt).toISOString()
              : null,
            id: last?.invoice?.id,
          }
        : null;
      return { items, nextCursor };
    }),

  byId: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getInvoiceById(ctx.db, input.id, ctx.teamId)),

  // Get invoice with line items and payment info
  getWithItems: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => getInvoiceWithItems(ctx.db, input.id, ctx.teamId)),

  // Get next invoice number
  getNextNumber: teamProcedure.query(async ({ ctx }) => {
    return { invoiceNumber: await getNextInvoiceNumber(ctx.db, ctx.teamId) };
  }),

  // Get default settings for new invoice (optionally from order)
  defaultSettings: teamProcedure
    .input(z.object({ orderId: z.string().uuid().optional() }).optional())
    .query(async ({ ctx, input }) => {
      const invoiceNumber = await getNextInvoiceNumber(ctx.db, ctx.teamId);

      // If creating from order, prefill data
      if (input?.orderId) {
        const order = await getOrderWithItemsById(ctx.db, input.orderId, ctx.teamId);
        if (!order) {
          throw new Error("Order not found");
        }

        // Map order items to invoice items
        const items = order.items.map((item: any) => ({
          name: item.name,
          quantity: item.quantity,
          unitPrice: Number.parseFloat(String(item.unitPrice || item.unit_price || 0)),
          total: Number.parseFloat(String(item.total || 0)),
          orderItemId: item.id,
        }));

        const subtotal = Number.parseFloat(String(order.order.totalPrice || 0));

        return {
          invoiceNumber,
          orderId: input.orderId,
          clientId: order.order.clientId,
          clientName: order.client?.name,
          subtotal,
          tax: 0,
          discount: 0,
          amount: subtotal,
          status: "draft" as const,
          dueDate: null,
          notes: order.order.notes || null,
          items,
        };
      }

      // Default empty invoice
      return {
        invoiceNumber,
        orderId: null,
        clientId: null,
        clientName: null,
        subtotal: 0,
        tax: 0,
        discount: 0,
        amount: 0,
        status: "draft" as const,
        dueDate: null,
        notes: null,
        items: [{ name: "", quantity: 1, unitPrice: 0, total: 0 }],
      };
    }),

  updateStatus: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        status: z.string(),
        paidAt: z.string().datetime().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      return updateInvoiceStatus(
        ctx.db,
        input.id,
        ctx.teamId,
        input.status,
        input.paidAt ? new Date(input.paidAt) : null,
      );
    }),

  update: teamProcedure
    .input(
      z.object({
        id: z.string().uuid(),
        invoiceNumber: z.string().optional(),
        amount: z.number().optional(),
        status: z.string().optional(),
        dueDate: z.string().datetime().nullable().optional(),
        paidAt: z.string().datetime().nullable().optional(),
        notes: z.string().nullable().optional(),
      }),
    )
    .mutation(async ({ ctx, input }) => {
      const { id, ...rest } = input as any;
      return updateInvoice(ctx.db, id, ctx.teamId, rest);
    }),

  // Create invoice with line items
  create: teamProcedure.input(invoiceCreateSchema).mutation(async ({ ctx, input }) => {
    const { items, ...invoiceData } = input;

    const invoice = await createInvoiceWithItems(
      ctx.db,
      {
        ...invoiceData,
        teamId: ctx.teamId,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString() : null,
      } as any,
      items.map((item) => ({
        ...item,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
      })),
    );

    return invoice;
  }),

  // Update draft invoice (only if status is draft)
  updateDraft: teamProcedure.input(invoiceUpdateSchema).mutation(async ({ ctx, input }) => {
    const { id, items, ...invoiceData } = input;

    const updated = await updateInvoiceWithItems(
      ctx.db,
      id,
      ctx.teamId,
      {
        ...invoiceData,
        dueDate: invoiceData.dueDate ? new Date(invoiceData.dueDate).toISOString() : undefined,
      } as any,
      items?.map((item) => ({
        ...item,
        unitPrice: String(item.unitPrice),
        total: String(item.total),
      })),
    );

    return updated;
  }),

  // Send invoice (mark as sent, makes it immutable)
  send: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      return updateInvoice(ctx.db, input.id, ctx.teamId, {
        status: "sent",
        sentAt: new Date().toISOString(),
      } as any);
    }),

  delete: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ ctx, input }) => {
      const res = await deleteInvoice(ctx.db, input.id, ctx.teamId);
      return { id: res?.id ?? input.id };
    }),
});
