/**
 * Types for Invoice Generator API
 * External service types separate from internal Notion database schemas
 */

import { z } from 'zod';

// Invoice Generation API Input Types
export interface InvoiceItemInput {
  name: string;
  quantity: number;
  unit_cost: number;
}

export interface InvoiceItem extends InvoiceItemInput {
  total_cost: number;
}

export interface InvoiceRequest {
  customer_name: string;
  phone_number?: string;
  items: InvoiceItemInput[];
  notes?: string;
}

export interface InvoiceResponse {
  success: boolean;
  invoice_id?: string;
  pdf_url?: string;
  record_url?: string;
  message: string;
}

// Zod Schemas for validation
export const InvoiceItemInputSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit_cost: z.number().positive(),
});

export const InvoiceItemSchema = z.object({
  name: z.string(),
  quantity: z.number().positive(),
  unit_cost: z.number().positive(),
  total_cost: z.number().positive(),
});

export const InvoiceRequestSchema = z.object({
  customer_name: z.string().min(1, 'Customer name is required'),
  phone_number: z.string().optional(),
  items: z.array(InvoiceItemInputSchema).min(1, 'At least one item is required'),
  notes: z.string().optional(),
});

export const InvoiceResponseSchema = z.object({
  success: z.boolean(),
  invoice_id: z.string().optional(),
  pdf_url: z.string().optional(),
  record_url: z.string().optional(),
  message: z.string(),
});

// Type inference from Zod schemas
export type InvoiceItemInputType = z.infer<typeof InvoiceItemInputSchema>;
export type InvoiceItemType = z.infer<typeof InvoiceItemSchema>;
export type InvoiceRequestType = z.infer<typeof InvoiceRequestSchema>;
export type InvoiceResponseType = z.infer<typeof InvoiceResponseSchema>;