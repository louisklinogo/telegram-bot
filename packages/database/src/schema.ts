import { pgTable, text, uuid, timestamp, numeric, jsonb, index, varchar } from 'drizzle-orm/pg-core';
import { relations } from 'drizzle-orm';

// Clients table - Core customer information
export const clients = pgTable('clients', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  phone: varchar('phone', { length: 50 }),
  email: varchar('email', { length: 255 }),
  address: text('address'),
  referralSource: text('referral_source'),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  nameIdx: index('idx_clients_name').on(table.name),
  phoneIdx: index('idx_clients_phone').on(table.phone),
  emailIdx: index('idx_clients_email').on(table.email),
}));

// Orders table - Tailoring orders with items
export const orders = pgTable('orders', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'set null' }),
  orderNumber: varchar('order_number', { length: 50 }).notNull().unique(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, in_progress, completed, cancelled
  items: jsonb('items').default([]).notNull(), // Array of {name, quantity, unit_cost, total_cost}
  totalPrice: numeric('total_price', { precision: 10, scale: 2 }).default('0').notNull(),
  depositAmount: numeric('deposit_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  balanceAmount: numeric('balance_amount', { precision: 10, scale: 2 }).default('0').notNull(),
  notes: text('notes'),
  dueDate: timestamp('due_date', { withTimezone: true }),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index('idx_orders_client_id').on(table.clientId),
  statusIdx: index('idx_orders_status').on(table.status),
  orderNumberIdx: index('idx_orders_order_number').on(table.orderNumber),
  createdAtIdx: index('idx_orders_created_at').on(table.createdAt),
}));

// Invoices table - Billing and payment tracking
export const invoices = pgTable('invoices', {
  id: uuid('id').primaryKey().defaultRandom(),
  orderId: uuid('order_id').references(() => orders.id, { onDelete: 'set null' }),
  invoiceNumber: varchar('invoice_number', { length: 50 }).notNull().unique(),
  amount: numeric('amount', { precision: 10, scale: 2 }).notNull(),
  status: varchar('status', { length: 50 }).default('pending').notNull(), // pending, paid, overdue, cancelled
  dueDate: timestamp('due_date', { withTimezone: true }),
  paidAt: timestamp('paid_at', { withTimezone: true }),
  invoiceUrl: text('invoice_url'), // PDF or file URL
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  orderIdIdx: index('idx_invoices_order_id').on(table.orderId),
  statusIdx: index('idx_invoices_status').on(table.status),
  invoiceNumberIdx: index('idx_invoices_invoice_number').on(table.invoiceNumber),
  createdAtIdx: index('idx_invoices_created_at').on(table.createdAt),
}));

// Measurements table - Customer measurements for tailoring
export const measurements = pgTable('measurements', {
  id: uuid('id').primaryKey().defaultRandom(),
  clientId: uuid('client_id').references(() => clients.id, { onDelete: 'cascade' }).notNull(),
  recordName: varchar('record_name', { length: 100 }), // e.g., "Wedding Suit - 2024"
  measurements: jsonb('measurements').default({}).notNull(), // {chest: 42, waist: 34, shoulder: 18, etc.}
  takenAt: timestamp('taken_at', { withTimezone: true }),
  notes: text('notes'),
  createdAt: timestamp('created_at', { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp('updated_at', { withTimezone: true }).defaultNow().notNull(),
}, (table) => ({
  clientIdIdx: index('idx_measurements_client_id').on(table.clientId),
  takenAtIdx: index('idx_measurements_taken_at').on(table.takenAt),
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
