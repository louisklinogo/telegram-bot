import { createOrderWithItems, ensureClient } from "@cimantikos/services";
import { createTool } from "@mastra/core/tools";
import { z } from "zod";

export const notionOrdersTool = createTool({
  id: "notion-orders-tool",
  description: "Create and manage orders stored in Supabase",
  inputSchema: z.object({
    customer_name: z.string().describe("Customer name"),
    phone_number: z.string().optional().describe("Customer phone number"),
    items: z
      .array(
        z.object({
          name: z.string(),
          quantity: z.number(),
          unit_cost: z.number(),
          total_cost: z.number(),
        }),
      )
      .describe("Order items"),
    total_price: z.number().describe("Total price of the order"),
    invoice_file_url: z.string().nullable().optional().describe("URL to the generated invoice PDF"),
    notes: z.string().optional().describe("Order notes"),
  }),
  outputSchema: z.object({
    success: z.boolean(),
    order_id: z.string().optional(),
    order_page_id: z.string().optional(),
    order_url: z.string().optional(),
    client_name: z.string().optional(),
    total_price: z.number().optional(),
    created_at: z.string().optional(),
    error: z.string().optional(),
  }),
  execute: async ({ context }) => {
    const { customer_name, phone_number, items, total_price, invoice_file_url, notes } = context;

    try {
      const client = await ensureClient({
        name: customer_name,
        phone: phone_number,
        notes,
      });

      const orderResult = await createOrderWithItems({
        clientId: client.id,
        totalPrice: total_price,
        notes: notes || null,
        invoiceFileUrl: invoice_file_url || null,
        items: items.map((item) => ({
          name: item.name,
          quantity: item.quantity,
          unit_cost: item.unit_cost,
          total_cost: item.total_cost,
        })),
      });

      return {
        success: true,
        order_id: orderResult.order.order_number,
        order_page_id: orderResult.order.id,
        order_url: orderResult.order.id,
        client_name: client.name,
        total_price,
        created_at: orderResult.order.created_at,
      };
    } catch (error) {
      console.error("Error creating order in Supabase:", error);
      return {
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred",
      };
    }
  },
});
