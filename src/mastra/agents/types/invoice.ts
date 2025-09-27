import { z } from 'zod';

export const InvoiceItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit_cost: z.number().positive(),
  total_cost: z.number().positive(),
});

export const InvoiceRequestSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  phone_number: z.string().optional(),
  items: z.array(InvoiceItemSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export const InvoiceResponseSchema = z.object({
  success: z.boolean(),
  invoice_id: z.string().optional(),
  pdf_url: z.string().optional(),
  notion_url: z.string().optional(),
  message: z.string(),
});

export type InvoiceItem = z.infer<typeof InvoiceItemSchema>;
export type InvoiceRequest = z.infer<typeof InvoiceRequestSchema>;
export type InvoiceResponse = z.infer<typeof InvoiceResponseSchema>;