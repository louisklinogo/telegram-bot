import { pgTable, text, uuid, timestamp, numeric, jsonb, index, varchar, check } from 'drizzle-orm/pg-core';
import { relations, sql } from 'drizzle-orm';

/**
 * Schema V2 - Cimantikós Clothing Company
 * All monetary values are in Ghana Cedis (GHS)
 */

// Clients table - Core customer information
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  // Contact Information
  name: text('name').notNull(),
  phone: varchar('phone', { length: 50 }),
  whatsapp: varchar('whatsapp', { length: 50 }).notNull(), // Required for WhatsApp marketing
  email: varchar('email', { length: 255 }),
  address: text('address'),
  // Business Information
  referralSource: text('referral_source'),
  notes: text('notes'),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  nameIdx: index('idx_clients_name').on(table.name),
  phoneIdx: index('idx_clients_phone').on(table.phone),
  whatsappIdx: index('idx_clients_whatsapp').on(table.whatsapp),
  emailIdx: index('idx_clients_email').on(table.email),
  deletedAtIdx: index('idx_clients_deleted_at').on(table.deletedAt),
}));

// Orders table - Tailoring orders with items
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  // References
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  // Order Information
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('generated').notNull(), // generated, in_progress, completed, cancelled
  // Items & Pricing (GHS)
  items: jsonb('items').default(sql`'[]'::jsonb`).notNull(), // Array of {name, quantity, unit_cost, total_cost}
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).default('0').notNull(),
  depositAmount: numeric('deposit_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  balanceAmount: numeric('balance_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  // Additional Info
  notes: text('notes'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  completedAt: timestamp('completed_at', { withTimezone: true }),
  cancelledAt: timestamp('cancelled_at', { withTimezone: true }),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  clientIdIdx: index('idx_orders_client_id').on(table.clientId),
  statusIdx: index('idx_orders_status').on(table.status),
  orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
  deletedAtIdx: index('idx_orders_deleted_at').on(table.deletedAt),
}));

// Invoices table - Billing and payment tracking
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  // References
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  // Invoice Information
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(), // GHS
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, sent, paid, overdue, cancelled
  // Payment Information
  dueDate: timestamp('due_date', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  invoiceUrl: text('invoice_url'), // PDF or file URL
  // Additional Info
  notes: text('notes'),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  orderIdIdx: index('idx_invoices_order_id').on(table.orderId),
  statusIdx: index('idx_invoices_status').on(table.status),
  invoiceNumberIdx: index('idx_invoices_invoice_number').on(table.invoiceNumber),
  createdAtIdx: index('idx_invoices_created_at').on(table.createdAt),
  deletedAtIdx: index('idx_invoices_deleted_at').on(table.deletedAt),
}));

// Measurements table - Customer measurements for tailoring
export const measurements = pgTable('measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  // References
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  // Measurement Information
  recordName: varchar('record_name', { length: 100 }), // e.g., "Wedding Kaftan 2024"
  garmentType: varchar('garment_type', { length: 50 }), // suit, kaftan, shirt, trouser, agbada, two_piece
  measurements: jsonb('measurements').default(sql`'{}'::jsonb`).notNull(), // {chest: "40/42", waist: "32", ...}
  // Additional Info
  notes: text('notes'),
  takenAt: timestamp('taken_at', { withTimezone: true }),
  // Metadata
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
}, (table) => ({
  clientIdIdx: index('idx_measurements_client_id').on(table.clientId),
  garmentTypeIdx: index('idx_measurements_garment_type').on(table.garmentType),
  takenAtIdx: index('idx_measurements_taken_at').on(table.takenAt),
  deletedAtIdx: index('idx_measurements_deleted_at').on(table.deletedAt),
}));

// Relations
export const clientsRelations = relations(clients, ({ many }) => ({
  orders: many(orders),
  measurements: many(measurements),
}));

export const ordersRelations = relations(orders, ({ one, many }) => ({
  client: one(clients, {
    fields: [orders.clientId],
    references: [clients.id],
  }),
  invoices: many(invoices),
}));

export const invoicesRelations = relations(invoices, ({ one }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  client: one(clients, {
    fields: [measurements.clientId],
    references: [clients.id],
  }),
}));
