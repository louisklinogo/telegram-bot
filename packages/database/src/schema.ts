import { relations, sql } from "drizzle-orm";
import {
  boolean,
  check,
  date,
  index,
  integer,
  jsonb,
  numeric,
  pgEnum,
  pgTable,
  primaryKey,
  text,
  timestamp,
  uniqueIndex,
  uuid,
  varchar,
} from "drizzle-orm/pg-core";

// ============================================================================
// Enums for transactions
// ============================================================================

export const transactionMethodEnum = pgEnum("transaction_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
]);

// Align with live Supabase: only these 4 values are valid
export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);

// Align with live Supabase transaction type enum
export const transactionTypeEnum = pgEnum("transaction_type", [
  "payment",
  "expense",
  "refund",
  "adjustment",
]);

export const transactionFrequencyEnum = pgEnum("transaction_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "semi_monthly",
  "annually",
  "irregular",
]);

// Communications enums
export const commMessageStatusEnum = pgEnum("comm_message_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);

// Invoices & Appointments enums (align with live DB)
export const invoiceStatusEnum = pgEnum("invoice_status", [
  "draft",
  "sent",
  "partially_paid",
  "paid",
  "overdue",
  "cancelled",
]);

export const appointmentStatusEnum = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);

// ============================================================================
// Enums for products
// ============================================================================
export const productStatusEnum = pgEnum("product_status", ["active", "draft", "archived"]);

export const productTypeEnum = pgEnum("product_type", ["physical", "service", "digital", "bundle"]);

export const fulfillmentTypeEnum = pgEnum("fulfillment_type", [
  "stocked",
  "dropship",
  "made_to_order",
  "preorder",
]);

/**
 * Schema V2 - FaworraClothing Company
 * All monetary values are in Ghana Cedis (GHS)
 */

// Teams - multi-tenant scope
export const teams = pgTable("teams", {
  id: uuid("id").primaryKey().defaultRandom(),
  name: text("name"),
  baseCurrency: text("base_currency").default("GHS"),
  country: text("country").default("GH"),
  timezone: text("timezone").default("Africa/Accra"),
  quietHours: text("quiet_hours").default("21:00-08:00"),
  locale: text("locale").default("en-GH"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Users - app-facing profile (auth provider user id should map here)
export const users = pgTable("users", {
  id: uuid("id").primaryKey().notNull(),
  email: varchar("email", { length: 255 }),
  fullName: text("full_name"),
  currentTeamId: uuid("current_team_id").references(() => teams.id, { onDelete: "set null" }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Team memberships - user roles per team
export const teamMemberships = pgTable(
  "team_memberships",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    userId: uuid("user_id")
      .notNull()
      .references(() => users.id, { onDelete: "cascade" }),
    role: varchar("role", { length: 32 }).notNull(), // owner|manager|agent|custom
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamId, table.userId], name: "team_memberships_pkey" }),
    roleCheck: check(
      "chk_team_memberships_role",
      sql`${table.role} in ('owner','manager','agent','custom')`
    ),
  })
);

// Clients table - Core customer information (team-scoped)
export const clients = pgTable(
  "clients",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    // Contact Information
    name: text("name").notNull(),
    phone: varchar("phone", { length: 50 }),
    whatsapp: varchar("whatsapp", { length: 50 }).notNull(), // Required for WhatsApp marketing
    email: varchar("email", { length: 255 }),
    address: text("address"),
    country: text("country"),
    countryCode: varchar("country_code", { length: 10 }),
    // Business Information
    company: text("company"),
    occupation: text("occupation"),
    referralSource: text("referral_source"),
    tags: jsonb("tags").$type<string[]>().default([]),
    notes: text("notes"),
    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdIdx: index("idx_clients_team_id").on(table.teamId),
    nameIdx: index("idx_clients_name").on(table.name),
    phoneIdx: index("idx_clients_phone").on(table.phone),
    whatsappIdx: index("idx_clients_whatsapp").on(table.whatsapp),
    emailIdx: index("idx_clients_email").on(table.email),
    deletedAtIdx: index("idx_clients_deleted_at").on(table.deletedAt),
  })
);

// Orders table - Tailoring orders with items
export const orders = pgTable(
  "orders",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // References
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    // Order Information
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    status: varchar("status", { length: 50 }).default("generated").notNull(), // generated, in_progress, completed, cancelled
    // Pricing (GHS)
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).default("0").notNull(),
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    balanceAmount: numeric("balance_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    // Additional Info
    notes: text("notes"),
    dueDate: timestamp("due_date", { withTimezone: true }),
    // Audit / provenance for agents & idempotency
    idempotencyKey: text("idempotency_key"),
    createdByType: text("created_by_type"), // user|agent|system
    createdById: uuid("created_by_id"),
    source: text("source"), // e.g., ui|api|agent
    conversationId: text("conversation_id"),
    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true }),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdIdx: index("idx_orders_team_id").on(table.teamId),
    clientIdIdx: index("idx_orders_client_id").on(table.clientId),
    statusIdx: index("idx_orders_status").on(table.status),
    teamOrderUnique: uniqueIndex("uniq_orders_team_order_number").on(
      table.teamId,
      table.orderNumber
    ),
    idempIdx: index("idx_orders_idempotency_key").on(table.idempotencyKey),
    createdAtIdx: index("idx_orders_created_at").on(table.createdAt),
    deletedAtIdx: index("idx_orders_deleted_at").on(table.deletedAt),
  })
);

// Invoices table - Billing and payment tracking
export const invoices = pgTable(
  "invoices",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // References
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    // Invoice Information
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    subtotal: numeric("subtotal", { precision: 10, scale: 2 }).notNull(),
    tax: numeric("tax", { precision: 10, scale: 2 }),
    discount: numeric("discount", { precision: 10, scale: 2 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 8 }).default("GHS").notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }),
    vatRate: numeric("vat_rate", { precision: 6, scale: 4 }),
    vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }),
    status: invoiceStatusEnum("status").default("draft").notNull(),
    // Payment Information
    dueDate: timestamp("due_date", { withTimezone: true }),
    sentAt: timestamp("sent_at", { withTimezone: true }), // When sent to client (makes immutable)
    paidAt: timestamp("paid_at", { withTimezone: true }), // When fully paid
    invoiceUrl: text("invoice_url"), // PDF URL
    // Additional Info
    notes: text("notes"),
    // Audit for agents & idempotency
    idempotencyKey: text("idempotency_key"),
    createdByType: text("created_by_type"),
    createdById: uuid("created_by_id"),
    source: text("source"),
    conversationId: text("conversation_id"),
    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdIdx: index("idx_invoices_team_id").on(table.teamId),
    orderIdIdx: index("idx_invoices_order_id").on(table.orderId),
    statusIdx: index("idx_invoices_status").on(table.status),
    sentAtIdx: index("idx_invoices_sent_at").on(table.sentAt),
    teamInvoiceUnique: index("uq_invoices_team_invoice").on(table.teamId, table.invoiceNumber),
    idempIdx: index("idx_invoices_idempotency_key").on(table.idempotencyKey),
    createdAtIdx: index("idx_invoices_created_at").on(table.createdAt),
    deletedAtIdx: index("idx_invoices_deleted_at").on(table.deletedAt),
  })
);

// Invoice Items table - Line items for invoices (snapshot from order items)
export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    invoiceId: uuid("invoice_id")
      .notNull()
      .references(() => invoices.id, { onDelete: "cascade" }),
    orderItemId: uuid("order_item_id").references(() => orderItems.id, { onDelete: "set null" }), // Link back to source
    name: text("name").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    invoiceIdIdx: index("idx_invoice_items_invoice_id").on(table.invoiceId),
  })
);

// Measurements table - Customer measurements for tailoring
export const measurements = pgTable(
  "measurements",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    // References
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    clientId: uuid("client_id")
      .references(() => clients.id, { onDelete: "cascade" })
      .notNull(),
    // Measurement Information
    recordName: varchar("record_name", { length: 100 }), // e.g., "Wedding Kaftan 2024", "Updated Jan 2025"
    garmentType: varchar("garment_type", { length: 50 }), // DEPRECATED: Now uses tags instead
    measurements: jsonb("measurements").default(sql`'{}'::jsonb`).notNull(), // {chest: "40/42", waist: "32", ...}
    // Versioning System
    version: integer("version").default(1).notNull(), // Version number (1, 2, 3...)
    measurementGroupId: uuid("measurement_group_id"), // Groups all versions together
    previousVersionId: uuid("previous_version_id").references((): any => measurements.id, {
      onDelete: "set null",
    }), // Links to parent version
    isActive: boolean("is_active").default(true).notNull(), // Current active version for client
    tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Flexible tags (replaces garment_type)
    // Additional Info
    notes: text("notes"),
    takenAt: timestamp("taken_at", { withTimezone: true }),
    // Metadata
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdIdx: index("idx_measurements_team_id").on(table.teamId),
    clientIdIdx: index("idx_measurements_client_id").on(table.clientId),
    garmentTypeIdx: index("idx_measurements_garment_type").on(table.garmentType),
    takenAtIdx: index("idx_measurements_taken_at").on(table.takenAt),
    deletedAtIdx: index("idx_measurements_deleted_at").on(table.deletedAt),
    // Versioning indexes
    measurementGroupIdIdx: index("idx_measurements_group_id").on(table.measurementGroupId),
    clientActiveIdx: index("idx_measurements_client_active").on(table.clientId, table.isActive),
    tagsIdx: index("idx_measurements_tags").on(table.tags),
  })
);

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

export const invoicesRelations = relations(invoices, ({ one, many }) => ({
  order: one(orders, {
    fields: [invoices.orderId],
    references: [orders.id],
  }),
  items: many(invoiceItems),
}));

export const invoiceItemsRelations = relations(invoiceItems, ({ one }) => ({
  invoice: one(invoices, {
    fields: [invoiceItems.invoiceId],
    references: [invoices.id],
  }),
  orderItem: one(orderItems, {
    fields: [invoiceItems.orderItemId],
    references: [orderItems.id],
  }),
}));

export const measurementsRelations = relations(measurements, ({ one }) => ({
  client: one(clients, {
    fields: [measurements.clientId],
    references: [clients.id],
  }),
}));

// ============================================================================
// Leads (Sales pipeline entries linked to contacts/threads)
// ============================================================================
export const leads = pgTable(
  "leads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id").references(() => communicationThreads.id, {
      onDelete: "set null",
    }),
    customerId: uuid("customer_id").references(() => clients.id, { onDelete: "set null" }),
    ownerUserId: uuid("owner_user_id").references(() => users.id, { onDelete: "set null" }),
    // Immutable prospect snapshot (captured at lead creation)
    prospectName: text("prospect_name"),
    prospectPhone: varchar("prospect_phone", { length: 50 }),
    prospectHandle: text("prospect_handle"),
    whatsappContactId: uuid("whatsapp_contact_id").references(() => whatsappContacts.id, {
      onDelete: "set null",
    }),
    instagramContactId: uuid("instagram_contact_id").references(() => instagramContacts.id, {
      onDelete: "set null",
    }),
    source: varchar("source", { length: 32 }).notNull(), // whatsapp|instagram|email|telegram
    status: varchar("status", { length: 32 }).default("new").notNull(), // new|interested|qualified|converted|lost
    score: integer("score").default(0).notNull(), // 0-100
    qualification: varchar("qualification", { length: 16 }).default("cold").notNull(), // hot|warm|cold
    messageCount: integer("message_count").default(0).notNull(),
    lastInteractionAt: timestamp("last_interaction_at", { withTimezone: true }),
    notes: text("notes"),
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_leads_team").on(table.teamId),
    teamStatusIdx: index("idx_leads_team_status").on(table.teamId, table.status),
    teamScoreIdx: index("idx_leads_team_score").on(table.teamId, table.score),
    lastInteractionIdx: index("idx_leads_last_interaction").on(
      table.teamId,
      table.lastInteractionAt,
      table.id
    ),
    uniqueTeamThread: uniqueIndex("uq_leads_team_thread").on(table.teamId, table.threadId),
  })
);

export const leadsRelations = relations(leads, ({ one }) => ({
  team: one(teams, { fields: [leads.teamId], references: [teams.id] }),
  thread: one(communicationThreads, {
    fields: [leads.threadId],
    references: [communicationThreads.id],
  }),
  client: one(clients, { fields: [leads.customerId], references: [clients.id] }),
  owner: one(users, { fields: [leads.ownerUserId], references: [users.id] }),
  whatsappContact: one(whatsappContacts, {
    fields: [leads.whatsappContactId],
    references: [whatsappContacts.id],
  }),
  instagramContact: one(instagramContacts, {
    fields: [leads.instagramContactId],
    references: [instagramContacts.id],
  }),
}));

export const teamsRelations = relations(teams, ({ many }) => ({
  clients: many(clients),
  orders: many(orders),
  invoices: many(invoices),
  measurements: many(measurements),
  memberships: many(teamMemberships),
  transactions: many(transactions),
  financialAccounts: many(financialAccounts),
  transactionCategories: many(transactionCategories),
  transactionTags: many(transactionTags),
  transactionAttachments: many(transactionAttachments),
  tags: many(tags),
  leads: many(leads),
}));

export const usersRelations = relations(users, ({ many }) => ({
  memberships: many(teamMemberships),
  assignedTransactions: many(transactions),
  uploadedAttachments: many(transactionAttachments),
}));

// ============================================================================
// Products domain
// ============================================================================

export const products = pgTable(
  "products",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: varchar("slug", { length: 120 }),
    type: productTypeEnum("type").default("physical").notNull(),
    status: productStatusEnum("status").default("active").notNull(),
    description: text("description"),
    categorySlug: varchar("category_slug", { length: 120 }),
    tags: jsonb("tags").$type<string[]>().default(sql`'[]'::jsonb`).notNull(),
    attributes: jsonb("attributes").default(sql`'{}'::jsonb`).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdx: index("idx_products_team").on(table.teamId),
    teamNameIdx: index("idx_products_team_name").on(table.teamId, table.name),
    teamSlugUnique: uniqueIndex("uq_products_team_slug").on(table.teamId, table.slug),
    statusIdx: index("idx_products_status").on(table.status),
  })
);

export const inventoryLocations = pgTable(
  "inventory_locations",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    code: varchar("code", { length: 32 }),
    isDefault: boolean("is_default").default(false).notNull(),
    address: text("address"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_locations_team").on(table.teamId),
    teamCodeUnique: uniqueIndex("uq_locations_team_code").on(table.teamId, table.code),
  })
);

export const productVariants = pgTable(
  "product_variants",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    name: text("name"),
    sku: varchar("sku", { length: 64 }),
    barcode: varchar("barcode", { length: 64 }),
    unitOfMeasure: varchar("unit_of_measure", { length: 32 }),
    packSize: numeric("pack_size", { precision: 10, scale: 3 }),
    price: numeric("price", { precision: 12, scale: 2 }),
    currency: varchar("currency", { length: 8 }),
    cost: numeric("cost", { precision: 12, scale: 2 }),
    status: productStatusEnum("status").default("active").notNull(),
    fulfillmentType: fulfillmentTypeEnum("fulfillment_type").default("stocked").notNull(),
    stockManaged: boolean("stock_managed").default(true).notNull(),
    leadTimeDays: integer("lead_time_days"),
    availabilityDate: date("availability_date"),
    backorderPolicy: varchar("backorder_policy", { length: 16 }), // deny|allow|preorder
    capacityPerPeriod: integer("capacity_per_period"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_variants_team").on(table.teamId),
    productIdx: index("idx_variants_product").on(table.productId),
    teamSkuUnique: uniqueIndex("uq_variants_team_sku").on(table.teamId, table.sku),
    statusIdx: index("idx_variants_status").on(table.status),
  })
);

export const productInventory = pgTable(
  "product_inventory",
  {
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id")
      .notNull()
      .references(() => productVariants.id, { onDelete: "cascade" }),
    locationId: uuid("location_id")
      .notNull()
      .references(() => inventoryLocations.id, { onDelete: "cascade" }),
    onHand: integer("on_hand").default(0).notNull(),
    allocated: integer("allocated").default(0).notNull(),
    safetyStock: integer("safety_stock").default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.variantId, table.locationId], name: "pk_product_inventory" }),
    teamIdx: index("idx_product_inventory_team").on(table.teamId),
  })
);

export const productsRelations = relations(products, ({ many, one }) => ({
  variants: many(productVariants),
}));

export const productVariantsRelations = relations(productVariants, ({ one, many }) => ({
  product: one(products, {
    fields: [productVariants.productId],
    references: [products.id],
  }),
  inventory: many(productInventory),
}));

export const inventoryLocationsRelations = relations(inventoryLocations, ({ many }) => ({
  inventory: many(productInventory),
}));

export const productInventoryRelations = relations(productInventory, ({ one }) => ({
  variant: one(productVariants, {
    fields: [productInventory.variantId],
    references: [productVariants.id],
  }),
  location: one(inventoryLocations, {
    fields: [productInventory.locationId],
    references: [inventoryLocations.id],
  }),
}));

// Product Categories (hierarchical, team-specific)
export const productCategories = pgTable(
  "product_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => productCategories.id, {
      onDelete: "set null",
    }),
    system: boolean("system").default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_product_categories_team_id").on(table.teamId),
    parentIdx: index("idx_product_categories_parent_id").on(table.parentId),
    slugIdx: index("idx_product_categories_slug").on(table.slug),
    uniqueSlugPerTeam: index("unique_product_category_slug_per_team").on(table.teamId, table.slug),
  })
);

export const productCategoriesRelations = relations(productCategories, ({ many }) => ({
  // children relation via parentId handled at query layer
  // products: many(products) - products keep a slug reference only for now
}));

// Product media: normalized images/files per product or variant
export const productMedia = pgTable(
  "product_media",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    productId: uuid("product_id")
      .notNull()
      .references(() => products.id, { onDelete: "cascade" }),
    variantId: uuid("variant_id").references(() => productVariants.id, { onDelete: "cascade" }),
    path: text("path").notNull(),
    alt: text("alt"),
    isPrimary: boolean("is_primary").default(false).notNull(),
    position: integer("position"),
    width: integer("width"),
    height: integer("height"),
    sizeBytes: integer("size_bytes"),
    mimeType: varchar("mime_type", { length: 128 }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_product_media_team").on(table.teamId),
    productIdx: index("idx_product_media_product").on(table.productId),
    variantIdx: index("idx_product_media_variant").on(table.variantId),
  })
);

export const productMediaRelations = relations(productMedia, ({ one }) => ({
  product: one(products, { fields: [productMedia.productId], references: [products.id] }),
  variant: one(productVariants, {
    fields: [productMedia.variantId],
    references: [productVariants.id],
  }),
}));

// Communications domain
export const communicationAccounts = pgTable(
  "communication_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    provider: varchar("provider", { length: 64 }).notNull(), // whatsapp_baileys|whatsapp_twilio|whatsapp_meta|instagram_meta
    externalId: text("external_id").notNull(), // phone number or page id
    displayName: text("display_name"),
    status: varchar("status", { length: 32 }).default("connected").notNull(),
    credentialsEncrypted: text("credentials_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_comm_accounts_team").on(table.teamId),
    teamProviderExternalUnique: index("uq_comm_accounts_team_provider_external").on(
      table.teamId,
      table.provider,
      table.externalId
    ),
  })
);

export const communicationThreads = pgTable(
  "communication_threads",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    accountId: uuid("account_id")
      .notNull()
      .references(() => communicationAccounts.id, { onDelete: "cascade" }),
    // Align with live DB: customer_id (optional link to clients)
    customerId: uuid("customer_id").references(() => clients.id, { onDelete: "set null" }),
    // Optional denormalized links to channel-specific contacts
    whatsappContactId: uuid("whatsapp_contact_id").references(() => whatsappContacts.id, {
      onDelete: "set null",
    }),
    instagramContactId: uuid("instagram_contact_id").references(() => instagramContacts.id, {
      onDelete: "set null",
    }),
    channel: varchar("channel", { length: 32 }).notNull(), // whatsapp|instagram
    externalContactId: text("external_contact_id").notNull(),
    status: varchar("status", { length: 32 }).default("open").notNull(), // open|pending|resolved|snoozed
    assignedUserId: uuid("assigned_user_id").references(() => users.id, { onDelete: "set null" }),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_comm_threads_team").on(table.teamId),
    accountContactUnique: index("uq_comm_threads_account_contact").on(
      table.accountId,
      table.externalContactId
    ),
    paginationIdx: index("idx_comm_threads_pagination").on(
      table.teamId,
      table.status,
      table.lastMessageAt,
      table.id
    ),
  })
);

export const communicationMessages = pgTable(
  "communication_messages",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    threadId: uuid("thread_id")
      .notNull()
      .references(() => communicationThreads.id, { onDelete: "cascade" }),
    providerMessageId: text("provider_message_id"),
    direction: varchar("direction", { length: 8 }).notNull(), // in|out
    type: varchar("type", { length: 16 }).notNull(), // text|image|video|audio|sticker|document
    content: text("content"), // text body or caption
    meta: jsonb("meta"),
    sentAt: timestamp("sent_at", { withTimezone: true }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true }),
    readAt: timestamp("read_at", { withTimezone: true }),
    error: text("error"),
    // Align with live DB extras
    isStatus: boolean("is_status").default(false).notNull(),
    status: commMessageStatusEnum("status").default("sent"),
    clientMessageId: text("client_message_id"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_comm_messages_team").on(table.teamId),
    threadIdx: index("idx_comm_messages_thread").on(table.threadId),
  })
);

export const messageAttachments = pgTable("message_attachments", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => communicationMessages.id, { onDelete: "cascade" }),
  storagePath: text("storage_path").notNull(),
  contentType: text("content_type"),
  size: numeric("size", { precision: 20, scale: 0 }),
  checksum: text("checksum"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const messageDelivery = pgTable("message_delivery", {
  id: uuid("id").primaryKey().defaultRandom(),
  messageId: uuid("message_id")
    .notNull()
    .references(() => communicationMessages.id, { onDelete: "cascade" }),
  status: varchar("status", { length: 16 }).notNull(), // queued|sent|delivered|read|failed
  providerErrorCode: text("provider_error_code"),
  retries: integer("retries"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// ============================================================================
// Additional tables to align Drizzle schema with live Supabase
// ============================================================================

// Users on Team (live table name)
export const usersOnTeam = pgTable("users_on_team", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id")
    .notNull()
    .references(() => users.id, { onDelete: "cascade" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  role: varchar("role", { length: 32 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Financial Accounts (manual first; ready for external providers later)
export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    type: varchar("type", { length: 32 }).notNull(), // cash | bank | mobile_money | card | other
    name: text("name").notNull(),
    currency: varchar("currency", { length: 3 }).default("GHS").notNull(),
    provider: varchar("provider", { length: 64 }),
    externalId: text("external_id"),
    status: varchar("status", { length: 32 }).default("active").notNull(),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }),
    syncCursor: text("sync_cursor"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_fin_accounts_team_id").on(table.teamId),
    teamNameUnique: index("uq_fin_accounts_team_name").on(table.teamId, table.name),
    teamProviderExternal: index("uq_fin_accounts_team_provider_external").on(
      table.teamId,
      table.provider,
      table.externalId
    ),
    statusIdx: index("idx_fin_accounts_status").on(table.status),
  })
);

// Financial transactions (Enhanced with Midday patterns)
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),

    // Core fields
    date: date("date").notNull(), // Accounting date (separate from createdAt)
    name: text("name").notNull(), // Transaction name/title
    description: text("description"), // Longer details (nullable in live DB)
    internalId: text("internal_id").notNull(), // For deduplication

    // Financial
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("GHS").notNull(),
    balance: numeric("balance", { precision: 10, scale: 2 }), // Running balance (NEW)
    baseAmount: numeric("base_amount", { precision: 10, scale: 2 }), // Converted to base currency (NEW)
    baseCurrency: varchar("base_currency", { length: 3 }), // Team's base currency (NEW)

    // Classification
    type: transactionTypeEnum("type").notNull(),
    category: varchar("category", { length: 100 }), // DEPRECATED: Keep for migration
    categorySlug: text("category_slug"), // FK to transaction_categories (NEW)
    // Live DB uses varchar(50) for payment_method
    paymentMethod: varchar("payment_method", { length: 50 }),
    status: transactionStatusEnum("status").default("completed"),

    // Relationships
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    assignedId: uuid("assigned_id").references(() => users.id, { onDelete: "set null" }), // Who owns/manages (NEW)
    accountId: uuid("account_id").references(() => financialAccounts.id, { onDelete: "set null" }),

    // Metadata
    transactionNumber: varchar("transaction_number", { length: 50 }).notNull(),
    counterpartyName: text("counterparty_name"), // Who paid/received (NEW)
    merchantName: text("merchant_name"), // Extracted merchant (NEW)
    paymentReference: varchar("payment_reference", { length: 100 }),
    notes: text("notes"),
    manual: boolean("manual").default(false), // User-created vs bank-imported (NEW)

    // Recurring transactions (NEW)
    recurring: boolean("recurring").default(false),
    frequency: transactionFrequencyEnum("frequency"),

    // AI enrichment (NEW)
    enrichmentCompleted: boolean("enrichment_completed").default(false),
    excludeFromAnalytics: boolean("exclude_from_analytics").default(false).notNull(),

    // Timestamps
    transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    // Enhanced indexes for better query performance
    teamDateIdx: index("idx_transactions_team_date").on(table.teamId, table.date),
    dateIdx: index("idx_transactions_date").on(table.date),
    assignedIdx: index("idx_transactions_assigned_id").on(table.assignedId),
    clientIdx: index("idx_transactions_client_id").on(table.clientId),
    categorySlugIdx: index("idx_transactions_category_slug").on(table.categorySlug),
    statusIdx: index("idx_transactions_status").on(table.status),
    teamStatusDateIdx: index("idx_transactions_team_status_date").on(
      table.teamId,
      table.status,
      table.date
    ),
    teamTypeIdx: index("idx_transactions_team_type_date").on(table.teamId, table.type, table.date),
    internalIdIdx: index("idx_transactions_internal_id").on(table.internalId),
    accountIdx: index("idx_transactions_account_id").on(table.accountId),
    teamAmountIdx: index("idx_transactions_team_amount").on(table.teamId, table.amount),
  })
);

export const transactionAllocations = pgTable("transaction_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  invoiceId: uuid("invoice_id")
    .notNull()
    .references(() => invoices.id, { onDelete: "cascade" }),
  amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Transaction Categories (Hierarchical, team-specific + system defaults)
export const transactionCategories = pgTable(
  "transaction_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"), // Hex color for UI
    description: text("description"),
    parentId: uuid("parent_id").references((): any => transactionCategories.id, {
      onDelete: "set null",
    }),
    // Tax fields and analytics behavior
    taxRate: numeric("tax_rate", { precision: 10, scale: 2 }),
    taxType: text("tax_type"),
    taxReportingCode: text("tax_reporting_code"),
    excluded: boolean("excluded").default(false).notNull(),
    system: boolean("system").default(false).notNull(), // System-provided vs user-created
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("idx_transaction_categories_team_id").on(table.teamId),
    parentIdIdx: index("idx_transaction_categories_parent_id").on(table.parentId),
    slugIdx: index("idx_transaction_categories_slug").on(table.slug),
    uniqueSlugPerTeam: index("unique_category_slug_per_team").on(table.teamId, table.slug),
  })
);

// Transaction Tags (many-to-many with tags table)
export const transactionTags = pgTable(
  "transaction_tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    tagId: uuid("tag_id")
      .notNull()
      .references(() => tags.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionIdx: index("idx_transaction_tags_transaction_id").on(table.transactionId),
    tagIdx: index("idx_transaction_tags_tag_id").on(table.tagId),
    teamIdx: index("idx_transaction_tags_team_id").on(table.teamId),
    uniqueTag: index("unique_transaction_tag").on(table.transactionId, table.tagId),
  })
);

// Mapping between product categories and transaction categories (per team)
export const productCategoryMappings = pgTable(
  "product_category_mappings",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    productCategoryId: uuid("product_category_id")
      .notNull()
      .references(() => productCategories.id, { onDelete: "cascade" }),
    transactionCategoryId: uuid("transaction_category_id")
      .notNull()
      .references((): any => transactionCategories.id, { onDelete: "cascade" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_pcm_team").on(table.teamId),
    productIdx: index("idx_pcm_product_category").on(table.productCategoryId),
    transactionIdx: index("idx_pcm_transaction_category").on(table.transactionCategoryId),
    uniquePerTeam: uniqueIndex("uq_pcm_team_product").on(table.teamId, table.productCategoryId),
  })
);

// Transaction Attachments (receipts, invoices, documents)
export const transactionAttachments = pgTable(
  "transaction_attachments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    transactionId: uuid("transaction_id")
      .notNull()
      .references(() => transactions.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    path: text("path").array().notNull(), // Supabase storage path array
    type: text("type"), // 'receipt', 'invoice', 'contract', 'other'
    mimeType: text("mime_type"), // 'image/jpeg', 'application/pdf', etc.
    size: numeric("size", { precision: 20, scale: 0 }), // File size in bytes
    checksum: text("checksum"), // For deduplication
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionIdx: index("idx_transaction_attachments_transaction_id").on(table.transactionId),
    teamIdx: index("idx_transaction_attachments_team_id").on(table.teamId),
    typeIdx: index("idx_transaction_attachments_type").on(table.type),
    checksumIdx: index("idx_transaction_attachments_checksum").on(table.checksum),
  })
);

// Tags table (if not already exists - shared across transactions, clients, etc.)
export const tags = pgTable(
  "tags",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    color: text("color"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdIdx: index("idx_tags_team_id").on(table.teamId),
    uniqueNamePerTeam: index("unique_tag_name_per_team").on(table.teamId, table.name),
  })
);

// Order items (row-per-item)
export const orderItems = pgTable(
  "order_items",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id")
      .notNull()
      .references(() => orders.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    quantity: integer("quantity").default(1).notNull(),
    // Use canonical column names used by existing DB (unit_price, total)
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric("total", { precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    // Match live DB index from order_items_order_id_idx
    orderIdIdx: index("order_items_order_id_idx").on(table.orderId),
    // Check constraint from live DB
    quantityCheck: check("order_items_quantity_check", sql`quantity > 0`),
  })
);

// Daily analytics summary (team scoped, day-granular)
export const teamDailyOrdersSummary = pgTable(
  "team_daily_orders_summary",
  {
    teamId: uuid("team_id").notNull(),
    day: date("day").notNull(),
    createdCount: integer("created_count").default(0).notNull(),
    createdCountExclCancelled: integer("created_count_excl_cancelled").default(0).notNull(),
    createdValueSumExclCancelled: numeric("created_value_sum_excl_cancelled", {
      precision: 12,
      scale: 2,
    })
      .default("0")
      .notNull(),
    completedCount: integer("completed_count").default(0).notNull(),
    completedValueSum: numeric("completed_value_sum", { precision: 12, scale: 2 })
      .default("0")
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    pk: primaryKey({ columns: [table.teamId, table.day], name: "team_daily_orders_summary_pkey" }),
  })
);

// Re-export Drizzle helpers to ensure single-module type identity across workspace
export {
  and,
  asc,
  desc,
  eq,
  gt,
  gte,
  ilike,
  inArray,
  isNull,
  lt,
  lte,
  ne,
  or,
  sql,
} from "drizzle-orm";

// Contacts for channels
export const whatsappContacts = pgTable("whatsapp_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  waId: text("wa_id").notNull(),
  phone: text("phone"),
  displayName: text("display_name"),
  profilePicUrl: text("profile_pic_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const instagramContacts = pgTable("instagram_contacts", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  username: text("username").notNull(),
  externalId: text("external_id"),
  displayName: text("display_name"),
  profilePicUrl: text("profile_pic_url"),
  metadata: jsonb("metadata"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

// Outbox for outbound communications
export const communicationOutbox = pgTable("communication_outbox", {
  id: uuid("id").primaryKey().defaultRandom(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  accountId: uuid("account_id")
    .notNull()
    .references(() => communicationAccounts.id, { onDelete: "cascade" }),
  recipient: text("recipient").notNull(),
  content: text("content").notNull(),
  status: text("status").default("queued").notNull(),
  error: text("error"),
  clientMessageId: text("client_message_id"),
  mediaPath: text("media_path"),
  mediaType: text("media_type"),
  mediaFilename: text("media_filename"),
  caption: text("caption"),
});

export const communicationTemplates = pgTable("communication_templates", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  provider: text("provider").notNull(),
  name: text("name").notNull(),
  category: text("category"),
  locale: text("locale"),
  body: text("body"),
  variables: jsonb("variables"),
  status: text("status"),
  externalId: text("external_id"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Bank statements
export const bankStatements = pgTable("bank_statements", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  source: text("source").notNull(),
  accountLabel: text("account_label"),
  currency: varchar("currency", { length: 3 }).default("GHS").notNull(),
  openingBalance: numeric("opening_balance"),
  closingBalance: numeric("closing_balance"),
  periodStart: timestamp("period_start", { withTimezone: true }),
  periodEnd: timestamp("period_end", { withTimezone: true }),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bankStatementLines = pgTable("bank_statement_lines", {
  id: uuid("id").primaryKey().defaultRandom(),
  statementId: uuid("statement_id")
    .notNull()
    .references(() => bankStatements.id, { onDelete: "cascade" }),
  occurredAt: timestamp("occurred_at", { withTimezone: true }).notNull(),
  description: text("description"),
  amount: numeric("amount").notNull(),
  balance: numeric("balance"),
  externalRef: text("external_ref"),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

export const bankStatementAllocations = pgTable("bank_statement_allocations", {
  id: uuid("id").primaryKey().defaultRandom(),
  lineId: uuid("line_id")
    .notNull()
    .references(() => bankStatementLines.id, { onDelete: "cascade" }),
  transactionId: uuid("transaction_id")
    .notNull()
    .references(() => transactions.id, { onDelete: "cascade" }),
  amount: numeric("amount").notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Notifications & Activities
export const notificationSettings = pgTable("notification_settings", {
  id: uuid("id").primaryKey().defaultRandom(),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  notificationType: text("notification_type").notNull(),
  channel: text("channel").notNull(),
  enabled: boolean("enabled").default(true).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
});

export const activities = pgTable("activities", {
  id: uuid("id").primaryKey().defaultRandom(),
  teamId: uuid("team_id")
    .notNull()
    .references(() => teams.id, { onDelete: "cascade" }),
  userId: uuid("user_id").references(() => users.id, { onDelete: "set null" }),
  type: text("type").notNull(),
  metadata: jsonb("metadata").default(sql`'{}'::jsonb`).notNull(),
  createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
});

// Documents (Vault) - File storage and management
export const documents = pgTable(
  "documents",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    pathTokens: text("path_tokens").array(), // Array of path segments, e.g., ["2024", "01", "receipt.pdf"]
    mimeType: text("mime_type"),
    size: integer("size"), // File size in bytes
    tags: text("tags").array().default(sql`ARRAY[]::text[]`), // Document tags for categorization
    processingStatus: varchar("processing_status", { length: 32 }).default("pending"), // pending|processing|completed|failed
    metadata: jsonb("metadata").default(sql`'{}'::jsonb`), // Additional metadata (OCR results, etc.)
    // Relations (optional)
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    // Audit
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
    teamIdIdx: index("idx_documents_team_id").on(table.teamId),
    nameIdx: index("idx_documents_name").on(table.name),
    pathIdx: index("idx_documents_path").on(table.pathTokens),
    tagsIdx: index("idx_documents_tags").on(table.tags),
    orderIdIdx: index("idx_documents_order_id").on(table.orderId),
    invoiceIdIdx: index("idx_documents_invoice_id").on(table.invoiceId),
    clientIdIdx: index("idx_documents_client_id").on(table.clientId),
    createdAtIdx: index("idx_documents_created_at").on(table.createdAt),
    deletedAtIdx: index("idx_documents_deleted_at").on(table.deletedAt),
  })
);

// Appointments (align with live Supabase)
export const appointments = pgTable(
  "appointments",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    staffUserId: uuid("staff_user_id").references(() => users.id, { onDelete: "set null" }),
    startAt: timestamp("start_at", { withTimezone: true }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true }),
    reminderAt: timestamp("reminder_at", { withTimezone: true }),
    status: appointmentStatusEnum("status").default("scheduled").notNull(),
    location: text("location"),
    notes: text("notes"),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    teamIdx: index("idx_appointments_team").on(table.teamId),
    clientIdx: index("idx_appointments_client").on(table.clientId),
    staffIdx: index("idx_appointments_staff").on(table.staffUserId),
    startIdx: index("idx_appointments_start_at").on(table.startAt),
  })
);

export const documentsRelations = relations(documents, ({ one }) => ({
  team: one(teams, {
    fields: [documents.teamId],
    references: [teams.id],
  }),
  order: one(orders, {
    fields: [documents.orderId],
    references: [orders.id],
  }),
  invoice: one(invoices, {
    fields: [documents.invoiceId],
    references: [invoices.id],
  }),
  client: one(clients, {
    fields: [documents.clientId],
    references: [clients.id],
  }),
  uploader: one(users, {
    fields: [documents.uploadedBy],
    references: [users.id],
  }),
}));

// ============================================================================
// Transaction Relations
// ============================================================================

export const transactionsRelations = relations(transactions, ({ one, many }) => ({
  team: one(teams, {
    fields: [transactions.teamId],
    references: [teams.id],
  }),
  client: one(clients, {
    fields: [transactions.clientId],
    references: [clients.id],
  }),
  order: one(orders, {
    fields: [transactions.orderId],
    references: [orders.id],
  }),
  invoice: one(invoices, {
    fields: [transactions.invoiceId],
    references: [invoices.id],
  }),
  assignedUser: one(users, {
    fields: [transactions.assignedId],
    references: [users.id],
  }),
  account: one(financialAccounts, {
    fields: [transactions.accountId],
    references: [financialAccounts.id],
  }),
  category: one(transactionCategories, {
    fields: [transactions.categorySlug],
    references: [transactionCategories.slug],
  }),
  tags: many(transactionTags),
  attachments: many(transactionAttachments),
  allocations: many(transactionAllocations),
}));

export const transactionCategoriesRelations = relations(transactionCategories, ({ one, many }) => ({
  team: one(teams, {
    fields: [transactionCategories.teamId],
    references: [teams.id],
  }),
  parent: one(transactionCategories, {
    fields: [transactionCategories.parentId],
    references: [transactionCategories.id],
    relationName: "parent_child",
  }),
  children: many(transactionCategories, {
    relationName: "parent_child",
  }),
  transactions: many(transactions),
}));

export const transactionTagsRelations = relations(transactionTags, ({ one }) => ({
  team: one(teams, {
    fields: [transactionTags.teamId],
    references: [teams.id],
  }),
  transaction: one(transactions, {
    fields: [transactionTags.transactionId],
    references: [transactions.id],
  }),
  tag: one(tags, {
    fields: [transactionTags.tagId],
    references: [tags.id],
  }),
}));

export const transactionAttachmentsRelations = relations(transactionAttachments, ({ one }) => ({
  team: one(teams, {
    fields: [transactionAttachments.teamId],
    references: [teams.id],
  }),
  transaction: one(transactions, {
    fields: [transactionAttachments.transactionId],
    references: [transactions.id],
  }),
  uploader: one(users, {
    fields: [transactionAttachments.uploadedBy],
    references: [users.id],
  }),
}));

export const tagsRelations = relations(tags, ({ one, many }) => ({
  team: one(teams, {
    fields: [tags.teamId],
    references: [teams.id],
  }),
  transactionTags: many(transactionTags),
}));

export const financialAccountsRelations = relations(financialAccounts, ({ one, many }) => ({
  team: one(teams, {
    fields: [financialAccounts.teamId],
    references: [teams.id],
  }),
  transactions: many(transactions),
}));
