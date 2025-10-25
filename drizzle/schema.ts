import {
  pgTable,
  index,
  foreignKey,
  pgPolicy,
  check,
  uuid,
  text,
  varchar,
  timestamp,
  jsonb,
  uniqueIndex,
  unique,
  numeric,
  integer,
  boolean,
  bigint,
  date,
  vector,
  primaryKey,
  pgView,
  pgEnum,
} from "drizzle-orm/pg-core";
import { sql } from "drizzle-orm";

export const appointmentStatus = pgEnum("appointment_status", [
  "scheduled",
  "completed",
  "cancelled",
  "no_show",
]);
export const commMessageStatus = pgEnum("comm_message_status", [
  "queued",
  "sent",
  "delivered",
  "read",
  "failed",
]);
export const invoiceStatus = pgEnum("invoice_status", [
  "draft",
  "sent",
  "paid",
  "overdue",
  "cancelled",
  "partially_paid",
]);
export const orderStatus = pgEnum("order_status", [
  "generated",
  "in_progress",
  "completed",
  "cancelled",
]);
export const teamRole = pgEnum("team_role", ["owner", "admin", "agent", "viewer"]);
export const transactionFrequency = pgEnum("transaction_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "semi_monthly",
  "annually",
  "irregular",
]);
export const transactionMethod = pgEnum("transaction_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
]);
export const transactionStatus = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "cancelled",
]);
export const transactionType = pgEnum("transaction_type", [
  "payment",
  "expense",
  "refund",
  "adjustment",
]);

export const clients = pgTable(
  "clients",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    name: text().notNull(),
    phone: varchar({ length: 50 }),
    whatsapp: varchar({ length: 50 }).notNull(),
    email: varchar({ length: 255 }),
    address: text(),
    referralSource: text("referral_source"),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    teamId: uuid("team_id").notNull(),
    country: text(),
    countryCode: varchar("country_code", { length: 10 }),
    company: text(),
    occupation: text(),
    tags: jsonb().default([]),
  },
  (table) => [
    index("clients_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    index("idx_clients_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_clients_email")
      .using("btree", table.email.asc().nullsLast().op("text_ops"))
      .where(sql`(email IS NOT NULL)`),
    index("idx_clients_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
    index("idx_clients_name_trgm").using("gin", table.name.asc().nullsLast().op("gin_trgm_ops")),
    index("idx_clients_phone")
      .using("btree", table.phone.asc().nullsLast().op("text_ops"))
      .where(sql`(phone IS NOT NULL)`),
    index("idx_clients_team_id")
      .using("btree", table.teamId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("idx_clients_whatsapp").using("btree", table.whatsapp.asc().nullsLast().op("text_ops")),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "clients_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Allow all operations for service role", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`true`,
    }),
    pgPolicy("clients_select", { as: "permissive", for: "select", to: ["authenticated"] }),
    check(
      "check_at_least_one_contact",
      sql`(phone IS NOT NULL) OR (whatsapp IS NOT NULL) OR (email IS NOT NULL)`
    ),
  ]
);

export const orders = pgTable(
  "orders",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clientId: uuid("client_id"),
    orderNumber: varchar("order_number", { length: 50 }).notNull(),
    status: orderStatus().default("generated").notNull(),
    totalPrice: numeric("total_price", { precision: 10, scale: 2 }).default("0").notNull(),
    depositAmount: numeric("deposit_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    balanceAmount: numeric("balance_amount", { precision: 10, scale: 2 }).default("0").notNull(),
    notes: text(),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    completedAt: timestamp("completed_at", { withTimezone: true, mode: "string" }),
    cancelledAt: timestamp("cancelled_at", { withTimezone: true, mode: "string" }),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    teamId: uuid("team_id").notNull(),
  },
  (table) => [
    index("idx_orders_active_status")
      .using(
        "btree",
        table.status.asc().nullsLast().op("timestamptz_ops"),
        table.createdAt.desc().nullsFirst().op("enum_ops")
      )
      .where(sql`(deleted_at IS NULL)`),
    index("idx_orders_client_id")
      .using("btree", table.clientId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(client_id IS NOT NULL)`),
    index("idx_orders_created_at").using(
      "btree",
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_orders_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_orders_due_date")
      .using("btree", table.dueDate.asc().nullsLast().op("timestamptz_ops"))
      .where(sql`((deleted_at IS NULL) AND (due_date IS NOT NULL))`),
    index("idx_orders_order_number").using(
      "btree",
      table.orderNumber.asc().nullsLast().op("text_ops")
    ),
    index("idx_orders_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index("idx_orders_team_id")
      .using("btree", table.teamId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("orders_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("uniq_orders_team_order_number").using(
      "btree",
      table.teamId.asc().nullsLast().op("text_ops"),
      table.orderNumber.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
      name: "orders_client_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "orders_team_id_fkey",
    }).onDelete("cascade"),
    unique("orders_order_number_key").on(table.orderNumber),
    pgPolicy("orders_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
    pgPolicy("Allow all operations for service_role", {
      as: "permissive",
      for: "all",
      to: ["service_role"],
    }),
    check("check_deposit_not_exceeding_total", sql`deposit_amount <= total_price`),
    check(
      "check_positive_amounts",
      sql`(total_price >= (0)::numeric) AND (deposit_amount >= (0)::numeric) AND (balance_amount >= (0)::numeric)`
    ),
    check(
      "check_valid_order_status",
      sql`(status)::text = ANY (ARRAY[('generated'::character varying)::text, ('in_progress'::character varying)::text, ('completed'::character varying)::text, ('cancelled'::character varying)::text])`
    ),
  ]
);

export const measurements = pgTable(
  "measurements",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    clientId: uuid("client_id").notNull(),
    recordName: varchar("record_name", { length: 100 }),
    garmentType: varchar("garment_type", { length: 50 }),
    measurements: jsonb().default({}).notNull(),
    notes: text(),
    takenAt: timestamp("taken_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    teamId: uuid("team_id").notNull(),
    version: integer().default(1).notNull(),
    measurementGroupId: uuid("measurement_group_id"),
    previousVersionId: uuid("previous_version_id"),
    isActive: boolean("is_active").default(true).notNull(),
    tags: text().array().default(["RAY"]),
  },
  (table) => [
    index("idx_measurements_client_active").using(
      "btree",
      table.clientId.asc().nullsLast().op("bool_ops"),
      table.isActive.asc().nullsLast().op("bool_ops")
    ),
    index("idx_measurements_client_id").using(
      "btree",
      table.clientId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_measurements_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_measurements_garment_type")
      .using("btree", table.garmentType.asc().nullsLast().op("text_ops"))
      .where(sql`(garment_type IS NOT NULL)`),
    index("idx_measurements_group_id").using(
      "btree",
      table.measurementGroupId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_measurements_tags").using("btree", table.tags.asc().nullsLast().op("array_ops")),
    index("idx_measurements_taken_at")
      .using("btree", table.takenAt.desc().nullsFirst().op("timestamptz_ops"))
      .where(sql`(taken_at IS NOT NULL)`),
    index("idx_measurements_team_id")
      .using("btree", table.teamId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("measurements_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
      name: "measurements_client_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.previousVersionId],
      foreignColumns: [table.id],
      name: "measurements_previous_version_id_measurements_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "measurements_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("Allow all operations for service role", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`true`,
    }),
    pgPolicy("measurements_select", { as: "permissive", for: "select", to: ["authenticated"] }),
    check(
      "check_valid_garment_type",
      sql`((garment_type)::text = ANY ((ARRAY['suit'::character varying, 'kaftan'::character varying, 'shirt'::character varying, 'trouser'::character varying, 'agbada'::character varying, 'two_piece'::character varying])::text[])) OR (garment_type IS NULL)`
    ),
  ]
);

export const teams = pgTable("teams", {
  id: uuid().defaultRandom().primaryKey().notNull(),
  name: text(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }).defaultNow().notNull(),
  baseCurrency: text("base_currency").default("GHS"),
  country: text().default("GH"),
  timezone: text().default("Africa/Accra"),
  quietHours: text("quiet_hours").default("21:00-08:00"),
  locale: text().default("en-GH"),
});

export const communicationAccounts = pgTable(
  "communication_accounts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    provider: text().notNull(),
    externalId: text("external_id").notNull(),
    displayName: text("display_name"),
    status: text().default("connected").notNull(),
    credentialsEncrypted: text("credentials_encrypted"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_comm_accounts_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    uniqueIndex("uq_comm_accounts_team_provider_external").using(
      "btree",
      table.teamId.asc().nullsLast().op("text_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "communication_accounts_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("comm_accounts_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const communicationThreads = pgTable(
  "communication_threads",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    accountId: uuid("account_id").notNull(),
    customerId: uuid("customer_id"),
    channel: text().notNull(),
    externalContactId: text("external_contact_id").notNull(),
    status: text().default("open").notNull(),
    assignedUserId: uuid("assigned_user_id"),
    lastMessageAt: timestamp("last_message_at", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    whatsappContactId: uuid("whatsapp_contact_id"),
    instagramContactId: uuid("instagram_contact_id"),
  },
  (table) => [
    index("idx_comm_threads_pagination").using(
      "btree",
      table.teamId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("timestamptz_ops"),
      table.lastMessageAt.desc().nullsFirst().op("text_ops"),
      table.id.desc().nullsFirst().op("uuid_ops")
    ),
    index("idx_comm_threads_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    index("idx_comm_threads_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    index("idx_comm_threads_team_status").using(
      "btree",
      table.teamId.asc().nullsLast().op("text_ops"),
      table.status.asc().nullsLast().op("uuid_ops")
    ),
    uniqueIndex("uq_comm_threads_account_contact").using(
      "btree",
      table.accountId.asc().nullsLast().op("uuid_ops"),
      table.externalContactId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [communicationAccounts.id],
      name: "communication_threads_account_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.assignedUserId],
      foreignColumns: [users.id],
      name: "communication_threads_assigned_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.customerId],
      foreignColumns: [clients.id],
      name: "communication_threads_customer_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.instagramContactId],
      foreignColumns: [instagramContacts.id],
      name: "communication_threads_instagram_contact_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "communication_threads_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.whatsappContactId],
      foreignColumns: [whatsappContacts.id],
      name: "communication_threads_whatsapp_contact_id_fkey",
    }).onDelete("set null"),
    pgPolicy("comm_threads_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const communicationMessages = pgTable(
  "communication_messages",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    threadId: uuid("thread_id").notNull(),
    providerMessageId: text("provider_message_id"),
    direction: text().notNull(),
    type: text().notNull(),
    content: text(),
    meta: jsonb(),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
    deliveredAt: timestamp("delivered_at", { withTimezone: true, mode: "string" }),
    readAt: timestamp("read_at", { withTimezone: true, mode: "string" }),
    error: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    isStatus: boolean("is_status").default(false).notNull(),
    status: commMessageStatus().default("sent"),
    clientMessageId: text("client_message_id"),
  },
  (table) => [
    index("idx_comm_messages_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index("idx_comm_messages_team").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    index("idx_comm_messages_thread").using(
      "btree",
      table.threadId.asc().nullsLast().op("uuid_ops")
    ),
    uniqueIndex("uq_comm_msg_team_client")
      .using(
        "btree",
        table.teamId.asc().nullsLast().op("uuid_ops"),
        table.clientMessageId.asc().nullsLast().op("uuid_ops")
      )
      .where(sql`(client_message_id IS NOT NULL)`),
    uniqueIndex("uq_comm_msg_team_provider")
      .using(
        "btree",
        table.teamId.asc().nullsLast().op("text_ops"),
        table.providerMessageId.asc().nullsLast().op("text_ops")
      )
      .where(sql`(provider_message_id IS NOT NULL)`),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "communication_messages_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.threadId],
      foreignColumns: [communicationThreads.id],
      name: "communication_messages_thread_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("comm_messages_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const users = pgTable(
  "users",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    email: text(),
    fullName: text("full_name"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    currentTeamId: uuid("current_team_id"),
  },
  (table) => [
    foreignKey({
      columns: [table.currentTeamId],
      foreignColumns: [teams.id],
      name: "users_current_team_id_fkey",
    }).onDelete("set null"),
    pgPolicy("users_select_self", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(id = auth.uid())`,
    }),
    pgPolicy("users_update_self", { as: "permissive", for: "update", to: ["authenticated"] }),
    pgPolicy("Enable insert for users based on user_id", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
  ]
);

export const transactionAllocations = pgTable(
  "transaction_allocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    transactionId: uuid("transaction_id").notNull(),
    invoiceId: uuid("invoice_id").notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("transaction_allocations_invoice_idx").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoices.id],
      name: "transaction_allocations_invoice_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_allocations_transaction_id_fkey",
    }).onDelete("cascade"),
    unique("transaction_allocations_transaction_id_invoice_id_key").on(
      table.transactionId,
      table.invoiceId
    ),
    pgPolicy("team_transaction_allocations_all", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`((EXISTS ( SELECT 1
   FROM (transactions t
     JOIN users_on_team u ON ((u.team_id = t.team_id)))
  WHERE ((t.id = transaction_allocations.transaction_id) AND (u.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (invoices i
     JOIN users_on_team u ON ((u.team_id = i.team_id)))
  WHERE ((i.id = transaction_allocations.invoice_id) AND (u.user_id = auth.uid())))))`,
      withCheck: sql`((EXISTS ( SELECT 1
   FROM (transactions t
     JOIN users_on_team u ON ((u.team_id = t.team_id)))
  WHERE ((t.id = transaction_allocations.transaction_id) AND (u.user_id = auth.uid())))) OR (EXISTS ( SELECT 1
   FROM (invoices i
     JOIN users_on_team u ON ((u.team_id = i.team_id)))
  WHERE ((i.id = transaction_allocations.invoice_id) AND (u.user_id = auth.uid())))))`,
    }),
    check("transaction_allocations_amount_check", sql`amount > (0)::numeric`),
  ]
);

export const invoiceItems = pgTable(
  "invoice_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    invoiceId: uuid("invoice_id").notNull(),
    orderItemId: uuid("order_item_id"),
    name: text().notNull(),
    quantity: integer().default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_invoice_items_invoice_id").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoices.id],
      name: "invoice_items_invoice_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.orderItemId],
      foreignColumns: [orderItems.id],
      name: "invoice_items_order_item_id_fkey",
    }).onDelete("set null"),
  ]
);

export const invoices = pgTable(
  "invoices",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id"),
    invoiceNumber: varchar("invoice_number", { length: 50 }).notNull(),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    status: invoiceStatus().default("draft").notNull(),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }),
    paidAt: timestamp("paid_at", { withTimezone: true, mode: "string" }),
    invoiceUrl: text("invoice_url"),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    currency: varchar({ length: 3 }).default("GHS").notNull(),
    vatRate: numeric("vat_rate", { precision: 5, scale: 2 }),
    vatAmount: numeric("vat_amount", { precision: 10, scale: 2 }),
    subtotal: numeric({ precision: 10, scale: 2 }).notNull(),
    exchangeRate: numeric("exchange_rate", { precision: 12, scale: 6 }),
    teamId: uuid("team_id").notNull(),
    paidAmount: numeric("paid_amount", { precision: 10, scale: 2 }).default("0"),
    tax: numeric({ precision: 10, scale: 2 }).default("0"),
    discount: numeric({ precision: 10, scale: 2 }).default("0"),
    sentAt: timestamp("sent_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_invoices_created_at").using(
      "btree",
      table.createdAt.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_invoices_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_invoices_invoice_number").using(
      "btree",
      table.invoiceNumber.asc().nullsLast().op("text_ops")
    ),
    index("idx_invoices_order_id")
      .using("btree", table.orderId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(order_id IS NOT NULL)`),
    index("idx_invoices_sent_at").using(
      "btree",
      table.sentAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_invoices_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index("idx_invoices_team_id")
      .using("btree", table.teamId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(deleted_at IS NULL)`),
    index("idx_invoices_unpaid")
      .using(
        "btree",
        table.dueDate.asc().nullsLast().op("enum_ops"),
        table.status.asc().nullsLast().op("timestamptz_ops")
      )
      .where(sql`(status = ANY (ARRAY['draft'::invoice_status, 'overdue'::invoice_status]))`),
    index("invoices_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "invoices_order_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "invoices_team_id_fkey",
    }).onDelete("cascade"),
    unique("invoices_invoice_number_key").on(table.invoiceNumber),
    pgPolicy("Allow all operations for service role", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`true`,
    }),
    pgPolicy("invoices_select", { as: "permissive", for: "select", to: ["authenticated"] }),
    check(
      "check_paid_status_requires_paid_at",
      sql`(((status)::text = 'paid'::text) AND (paid_at IS NOT NULL)) OR ((status)::text <> 'paid'::text)`
    ),
    check("check_positive_invoice_amount", sql`amount > (0)::numeric`),
    check(
      "check_valid_invoice_status",
      sql`(status)::text = ANY (ARRAY[('pending'::character varying)::text, ('sent'::character varying)::text, ('paid'::character varying)::text, ('overdue'::character varying)::text, ('cancelled'::character varying)::text])`
    ),
  ]
);

export const orderItems = pgTable(
  "order_items",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id").notNull(),
    name: text().notNull(),
    quantity: integer().default(1).notNull(),
    unitPrice: numeric("unit_price", { precision: 10, scale: 2 }).default("0").notNull(),
    total: numeric({ precision: 10, scale: 2 }).default("0").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("order_items_order_id_idx").using(
      "btree",
      table.orderId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "order_items_order_id_fkey",
    }).onDelete("cascade"),
    check("order_items_quantity_check", sql`quantity > 0`),
  ]
);

export const messageAttachments = pgTable(
  "message_attachments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid("message_id").notNull(),
    storagePath: text("storage_path").notNull(),
    contentType: text("content_type"),
    // You can use { mode: "bigint" } if numbers are exceeding js number limitations
    size: bigint({ mode: "number" }),
    checksum: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [communicationMessages.id],
      name: "message_attachments_message_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("msg_attachments_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM communication_messages m
  WHERE ((m.id = message_attachments.message_id) AND (m.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM communication_messages m
  WHERE ((m.id = message_attachments.message_id) AND (m.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
    }),
  ]
);

export const bankStatements = pgTable(
  "bank_statements",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    source: text().notNull(),
    accountLabel: text("account_label"),
    currency: varchar({ length: 3 }).default("GHS").notNull(),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }),
    closingBalance: numeric("closing_balance", { precision: 12, scale: 2 }),
    periodStart: timestamp("period_start", { withTimezone: true, mode: "string" }),
    periodEnd: timestamp("period_end", { withTimezone: true, mode: "string" }),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bank_statements_team_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "bank_statements_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("bank_statements_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const communicationOutbox = pgTable(
  "communication_outbox",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    teamId: uuid("team_id").notNull(),
    accountId: uuid("account_id").notNull(),
    recipient: text().notNull(),
    content: text().notNull(),
    status: text().default("queued").notNull(),
    error: text(),
    clientMessageId: text("client_message_id"),
    mediaPath: text("media_path"),
    mediaType: text("media_type"),
    mediaFilename: text("media_filename"),
    caption: text(),
  },
  (table) => [
    index("idx_comm_outbox_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    uniqueIndex("uq_outbox_team_client")
      .using(
        "btree",
        table.teamId.asc().nullsLast().op("text_ops"),
        table.clientMessageId.asc().nullsLast().op("text_ops")
      )
      .where(sql`(client_message_id IS NOT NULL)`),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [communicationAccounts.id],
      name: "communication_outbox_account_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "communication_outbox_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("comm_outbox_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const messageDelivery = pgTable(
  "message_delivery",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    messageId: uuid("message_id").notNull(),
    status: text().notNull(),
    providerErrorCode: text("provider_error_code"),
    retries: integer(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.messageId],
      foreignColumns: [communicationMessages.id],
      name: "message_delivery_message_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("team_message_delivery_all", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`(EXISTS ( SELECT 1
   FROM (communication_messages m
     JOIN users_on_team u ON ((u.team_id = m.team_id)))
  WHERE ((m.id = message_delivery.message_id) AND (u.user_id = auth.uid()))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM (communication_messages m
     JOIN users_on_team u ON ((u.team_id = m.team_id)))
  WHERE ((m.id = message_delivery.message_id) AND (u.user_id = auth.uid()))))`,
    }),
  ]
);

export const usersOnTeam = pgTable(
  "users_on_team",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    teamId: uuid("team_id").notNull(),
    role: teamRole().default("agent").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("users_on_team_team_id_idx").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    index("users_on_team_user_id_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "users_on_team_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "users_on_team_user_id_fkey",
    }).onDelete("cascade"),
    unique("users_on_team_user_id_team_id_key").on(table.userId, table.teamId),
    pgPolicy("users_on_team_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`((team_id = ANY (private.get_teams_for_authenticated_user())) OR (user_id = auth.uid()))`,
      withCheck: sql`((team_id = ANY (private.get_teams_for_authenticated_user())) OR (user_id = auth.uid()))`,
    }),
  ]
);

export const userInvites = pgTable("user_invites", {
	id: uuid().defaultRandom().primaryKey().notNull(),
	teamId: uuid("team_id").notNull(),
	email: text().notNull(),
	role: teamRole().default('agent').notNull(),
	code: text().default(encode(gen_random_bytes(16), \'hex\'::text)).notNull(),
	invitedBy: uuid("invited_by"),
	createdAt: timestamp("created_at", { withTimezone: true, mode: 'string' }).defaultNow().notNull(),
}, (table) => [
	index("user_invites_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
	foreignKey({
			columns: [table.invitedBy],
			foreignColumns: [users.id],
			name: "user_invites_invited_by_fkey"
		}).onDelete("set null"),
	foreignKey({
			columns: [table.teamId],
			foreignColumns: [teams.id],
			name: "user_invites_team_id_fkey"
		}).onDelete("cascade"),
	unique("user_invites_team_id_email_key").on(table.teamId, table.email),
	unique("user_invites_code_key").on(table.code),
	pgPolicy("user_invites_select_by_email", { as: "permissive", for: "select", to: ["authenticated"], using: sql`((auth.jwt() ->> 'email'::text) = email)` }),
	pgPolicy("user_invites_team_rw", { as: "permissive", for: "all", to: ["authenticated"] }),
]);

export const whatsappContacts = pgTable(
  "whatsapp_contacts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    waId: text("wa_id").notNull(),
    phone: text(),
    displayName: text("display_name"),
    profilePicUrl: text("profile_pic_url"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("whatsapp_contacts_team_idx").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "whatsapp_contacts_team_id_fkey",
    }).onDelete("cascade"),
    unique("whatsapp_contacts_team_id_wa_id_key").on(table.teamId, table.waId),
    pgPolicy("team_whatsapp_contacts_all", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`(team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))`,
      withCheck: sql`(team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))`,
    }),
  ]
);

export const instagramContacts = pgTable(
  "instagram_contacts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    username: text().notNull(),
    externalId: text("external_id"),
    displayName: text("display_name"),
    profilePicUrl: text("profile_pic_url"),
    metadata: jsonb(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("instagram_contacts_team_idx").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "instagram_contacts_team_id_fkey",
    }).onDelete("cascade"),
    unique("instagram_contacts_team_id_username_key").on(table.teamId, table.username),
    pgPolicy("team_instagram_contacts_all", {
      as: "permissive",
      for: "all",
      to: ["public"],
      using: sql`(team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))`,
      withCheck: sql`(team_id IN ( SELECT users_on_team.team_id
   FROM users_on_team
  WHERE (users_on_team.user_id = auth.uid())))`,
    }),
  ]
);

export const activities = pgTable(
  "activities",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    userId: uuid("user_id"),
    type: text().notNull(),
    metadata: jsonb().default({}).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("activities_team_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "activities_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "activities_user_id_fkey",
    }).onDelete("set null"),
    pgPolicy("activities_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const notificationSettings = pgTable(
  "notification_settings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    userId: uuid("user_id").notNull(),
    teamId: uuid("team_id").notNull(),
    notificationType: text("notification_type").notNull(),
    channel: text().notNull(),
    enabled: boolean().default(true).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("notification_settings_user_team_idx").using(
      "btree",
      table.userId.asc().nullsLast().op("uuid_ops"),
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "notification_settings_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.userId],
      foreignColumns: [users.id],
      name: "notification_settings_user_id_fkey",
    }).onDelete("cascade"),
    unique("notification_settings_user_id_team_id_notification_type_cha_key").on(
      table.userId,
      table.teamId,
      table.notificationType,
      table.channel
    ),
    pgPolicy("notif_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`((user_id = auth.uid()) AND (team_id = ANY (private.get_teams_for_authenticated_user())))`,
      withCheck: sql`((user_id = auth.uid()) AND (team_id = ANY (private.get_teams_for_authenticated_user())))`,
    }),
  ]
);

export const bankStatementLines = pgTable(
  "bank_statement_lines",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    statementId: uuid("statement_id").notNull(),
    occurredAt: timestamp("occurred_at", { withTimezone: true, mode: "string" }).notNull(),
    description: text(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    balance: numeric({ precision: 12, scale: 2 }),
    externalRef: text("external_ref"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("bank_statement_lines_statement_idx").using(
      "btree",
      table.statementId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.statementId],
      foreignColumns: [bankStatements.id],
      name: "bank_statement_lines_statement_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("bank_statement_lines_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM bank_statements s
  WHERE ((s.id = bank_statement_lines.statement_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM bank_statements s
  WHERE ((s.id = bank_statement_lines.statement_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
    }),
  ]
);

export const bankStatementAllocations = pgTable(
  "bank_statement_allocations",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    lineId: uuid("line_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    amount: numeric({ precision: 12, scale: 2 }).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    foreignKey({
      columns: [table.lineId],
      foreignColumns: [bankStatementLines.id],
      name: "bank_statement_allocations_line_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "bank_statement_allocations_transaction_id_fkey",
    }).onDelete("cascade"),
    unique("bank_statement_allocations_line_id_transaction_id_key").on(
      table.lineId,
      table.transactionId
    ),
    pgPolicy("bank_statement_allocations_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(EXISTS ( SELECT 1
   FROM (bank_statement_lines l
     JOIN bank_statements s ON ((s.id = l.statement_id)))
  WHERE ((l.id = bank_statement_allocations.line_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
      withCheck: sql`(EXISTS ( SELECT 1
   FROM (bank_statement_lines l
     JOIN bank_statements s ON ((s.id = l.statement_id)))
  WHERE ((l.id = bank_statement_allocations.line_id) AND (s.team_id = ANY (private.get_teams_for_authenticated_user())))))`,
    }),
    check("bank_statement_allocations_amount_check", sql`amount > (0)::numeric`),
  ]
);

export const appointments = pgTable(
  "appointments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    clientId: uuid("client_id"),
    staffUserId: uuid("staff_user_id"),
    startAt: timestamp("start_at", { withTimezone: true, mode: "string" }).notNull(),
    endAt: timestamp("end_at", { withTimezone: true, mode: "string" }),
    status: appointmentStatus().default("scheduled").notNull(),
    location: text(),
    reminderAt: timestamp("reminder_at", { withTimezone: true, mode: "string" }),
    notes: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("appointments_team_start_idx").using(
      "btree",
      table.teamId.asc().nullsLast().op("timestamptz_ops"),
      table.startAt.asc().nullsLast().op("timestamptz_ops")
    ),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
      name: "appointments_client_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.staffUserId],
      foreignColumns: [users.id],
      name: "appointments_staff_user_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "appointments_team_id_fkey",
    }).onDelete("cascade"),
    pgPolicy("appointments_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const communicationTemplates = pgTable(
  "communication_templates",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    provider: text().notNull(),
    name: text().notNull(),
    category: text(),
    locale: text(),
    body: text(),
    variables: jsonb(),
    status: text(),
    externalId: text("external_id"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("communication_templates_team_idx").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "communication_templates_team_id_fkey",
    }).onDelete("cascade"),
    unique("communication_templates_team_id_provider_name_key").on(
      table.teamId,
      table.provider,
      table.name
    ),
    pgPolicy("comm_templates_rw", {
      as: "permissive",
      for: "all",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
      withCheck: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
  ]
);

export const documents = pgTable(
  "documents",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    name: text().notNull(),
    pathTokens: text("path_tokens").array(),
    mimeType: text("mime_type"),
    size: integer(),
    tags: text().array().default(["RAY"]),
    processingStatus: varchar("processing_status", { length: 32 }).default("pending"),
    metadata: jsonb().default({}),
    orderId: uuid("order_id"),
    invoiceId: uuid("invoice_id"),
    clientId: uuid("client_id"),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  },
  (table) => [
    index("idx_documents_client_id").using(
      "btree",
      table.clientId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_documents_created_at").using(
      "btree",
      table.createdAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_documents_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_documents_invoice_id").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_documents_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
    index("idx_documents_order_id").using("btree", table.orderId.asc().nullsLast().op("uuid_ops")),
    index("idx_documents_path").using("btree", table.pathTokens.asc().nullsLast().op("array_ops")),
    index("idx_documents_tags").using("btree", table.tags.asc().nullsLast().op("array_ops")),
    index("idx_documents_team_id").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
      name: "documents_client_id_clients_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoices.id],
      name: "documents_invoice_id_invoices_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "documents_order_id_orders_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "documents_team_id_teams_id_fk",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.id],
      name: "documents_uploaded_by_users_id_fk",
    }).onDelete("set null"),
  ]
);

export const tags = pgTable(
  "tags",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    name: text().notNull(),
    color: text(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_tags_name").using("btree", table.name.asc().nullsLast().op("text_ops")),
    index("idx_tags_team_id").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "tags_team_id_fkey",
    }).onDelete("cascade"),
    unique("unique_tag_name_per_team").on(table.teamId, table.name),
  ]
);

export const transactionTags = pgTable(
  "transaction_tags",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    tagId: uuid("tag_id").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transaction_tags_tag_id").using(
      "btree",
      table.tagId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_tags_team_id").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_tags_team_transaction_tag").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops"),
      table.transactionId.asc().nullsLast().op("uuid_ops"),
      table.tagId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_tags_transaction_id").using(
      "btree",
      table.transactionId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.tagId],
      foreignColumns: [tags.id],
      name: "transaction_tags_tag_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transaction_tags_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_tags_transaction_id_fkey",
    }).onDelete("cascade"),
    unique("unique_transaction_tag").on(table.transactionId, table.tagId),
    pgPolicy("team_select_transaction_tags", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`(team_id = ( SELECT users.current_team_id
   FROM users
  WHERE (users.id = auth.uid())))`,
    }),
    pgPolicy("team_insert_transaction_tags", { as: "permissive", for: "insert", to: ["public"] }),
    pgPolicy("team_update_transaction_tags", { as: "permissive", for: "update", to: ["public"] }),
    pgPolicy("team_delete_transaction_tags", { as: "permissive", for: "delete", to: ["public"] }),
  ]
);

export const transactionAttachments = pgTable(
  "transaction_attachments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    name: text().notNull(),
    path: text().array().notNull(),
    type: text(),
    mimeType: text("mime_type"),
    size: numeric({ precision: 20, scale: 0 }),
    checksum: text(),
    uploadedBy: uuid("uploaded_by"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transaction_attachments_checksum")
      .using("btree", table.checksum.asc().nullsLast().op("text_ops"))
      .where(sql`(checksum IS NOT NULL)`),
    index("idx_transaction_attachments_team_id").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_attachments_transaction_id").using(
      "btree",
      table.transactionId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_attachments_type")
      .using("btree", table.type.asc().nullsLast().op("text_ops"))
      .where(sql`(type IS NOT NULL)`),
    index("idx_transaction_attachments_uploaded_by")
      .using("btree", table.uploadedBy.asc().nullsLast().op("uuid_ops"))
      .where(sql`(uploaded_by IS NOT NULL)`),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transaction_attachments_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_attachments_transaction_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.uploadedBy],
      foreignColumns: [users.id],
      name: "transaction_attachments_uploaded_by_fkey",
    }).onDelete("set null"),
    pgPolicy("team_select_transaction_attachments", {
      as: "permissive",
      for: "select",
      to: ["public"],
      using: sql`(team_id = ( SELECT users.current_team_id
   FROM users
  WHERE (users.id = auth.uid())))`,
    }),
    pgPolicy("team_insert_transaction_attachments", {
      as: "permissive",
      for: "insert",
      to: ["public"],
    }),
    pgPolicy("team_update_transaction_attachments", {
      as: "permissive",
      for: "update",
      to: ["public"],
    }),
    pgPolicy("team_delete_transaction_attachments", {
      as: "permissive",
      for: "delete",
      to: ["public"],
    }),
    check("check_attachment_path_not_empty", sql`array_length(path, 1) > 0`),
    check("check_attachment_size_positive", sql`(size IS NULL) OR (size > (0)::numeric)`),
  ]
);

export const transactions = pgTable(
  "transactions",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    orderId: uuid("order_id"),
    invoiceId: uuid("invoice_id"),
    clientId: uuid("client_id"),
    transactionNumber: varchar("transaction_number", { length: 50 }).notNull(),
    type: transactionType().notNull(),
    category: varchar({ length: 100 }),
    amount: numeric({ precision: 10, scale: 2 }).notNull(),
    currency: varchar({ length: 3 }).default("GHS").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    paymentReference: varchar("payment_reference", { length: 100 }),
    description: text(),
    notes: text(),
    transactionDate: timestamp("transaction_date", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }),
    status: transactionStatus().default("completed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
    teamId: uuid("team_id").notNull(),
    date: date().notNull(),
    name: text().notNull(),
    internalId: text("internal_id").notNull(),
    balance: numeric({ precision: 10, scale: 2 }),
    baseAmount: numeric("base_amount", { precision: 10, scale: 2 }),
    baseCurrency: varchar("base_currency", { length: 3 }),
    categorySlug: text("category_slug"),
    assignedId: uuid("assigned_id"),
    counterpartyName: text("counterparty_name"),
    merchantName: text("merchant_name"),
    manual: boolean().default(false),
    recurring: boolean().default(false),
    frequency: transactionFrequency(),
    enrichmentCompleted: boolean("enrichment_completed").default(false),
    // TODO: failed to parse database type 'tsvector'
    ftsVector: unknown("fts_vector").generatedAlwaysAs(
      sql`to_tsvector('english'::regconfig, ((((((((COALESCE(name, ''::text) || ' '::text) || COALESCE(description, ''::text)) || ' '::text) || COALESCE(counterparty_name, ''::text)) || ' '::text) || COALESCE(merchant_name, ''::text)) || ' '::text) || (COALESCE(category, ''::character varying))::text))`
    ),
    accountId: uuid("account_id"),
    excludeFromAnalytics: boolean("exclude_from_analytics").default(false).notNull(),
  },
  (table) => [
    index("idx_transactions_account_id").using(
      "btree",
      table.accountId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transactions_assigned_id")
      .using("btree", table.assignedId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(assigned_id IS NOT NULL)`),
    index("idx_transactions_category_slug")
      .using("btree", table.categorySlug.asc().nullsLast().op("text_ops"))
      .where(sql`(category_slug IS NOT NULL)`),
    index("idx_transactions_client_id").using(
      "btree",
      table.clientId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transactions_date").using(
      "btree",
      table.transactionDate.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_transactions_deleted_at").using(
      "btree",
      table.deletedAt.asc().nullsLast().op("timestamptz_ops")
    ),
    index("idx_transactions_description_trgm").using(
      "gin",
      table.description.asc().nullsLast().op("gin_trgm_ops")
    ),
    index("idx_transactions_description_trigram").using(
      "gin",
      table.description.asc().nullsLast().op("gin_trgm_ops")
    ),
    index("idx_transactions_fts").using(
      "gin",
      table.ftsVector.asc().nullsLast().op("tsvector_ops")
    ),
    index("idx_transactions_internal_id").using(
      "btree",
      table.internalId.asc().nullsLast().op("text_ops")
    ),
    index("idx_transactions_invoice_id").using(
      "btree",
      table.invoiceId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transactions_name_trgm").using(
      "gin",
      table.name.asc().nullsLast().op("gin_trgm_ops")
    ),
    index("idx_transactions_name_trigram").using(
      "gin",
      table.name.asc().nullsLast().op("gin_trgm_ops")
    ),
    index("idx_transactions_order_id").using(
      "btree",
      table.orderId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transactions_status").using("btree", table.status.asc().nullsLast().op("enum_ops")),
    index("idx_transactions_team_date").using(
      "btree",
      table.teamId.asc().nullsLast().op("date_ops"),
      table.date.desc().nullsFirst().op("date_ops")
    ),
    index("idx_transactions_team_deleted_date").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops"),
      table.deletedAt.asc().nullsLast().op("uuid_ops"),
      table.transactionDate.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_transactions_team_id").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    index("idx_transactions_team_pagination")
      .using(
        "btree",
        table.teamId.asc().nullsLast().op("uuid_ops"),
        table.date.desc().nullsFirst().op("uuid_ops"),
        table.id.desc().nullsFirst().op("uuid_ops")
      )
      .where(sql`(deleted_at IS NULL)`),
    index("idx_transactions_team_status_date").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops"),
      table.status.asc().nullsLast().op("date_ops"),
      table.date.desc().nullsFirst().op("uuid_ops")
    ),
    index("idx_transactions_team_type_date").using(
      "btree",
      table.teamId.asc().nullsLast().op("enum_ops"),
      table.type.asc().nullsLast().op("uuid_ops"),
      table.date.desc().nullsFirst().op("uuid_ops")
    ),
    index("idx_transactions_transaction_date").using(
      "btree",
      table.transactionDate.desc().nullsFirst().op("timestamptz_ops")
    ),
    index("idx_transactions_type").using("btree", table.type.asc().nullsLast().op("enum_ops")),
    index("transactions_team_id_idx").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    foreignKey({
      columns: [table.assignedId],
      foreignColumns: [users.id],
      name: "fk_transactions_assigned_user",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId, table.categorySlug],
      foreignColumns: [transactionCategories.teamId, transactionCategories.slug],
      name: "fk_transactions_category",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.accountId],
      foreignColumns: [financialAccounts.id],
      name: "transactions_account_id_financial_accounts_id_fk",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.clientId],
      foreignColumns: [clients.id],
      name: "transactions_client_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.invoiceId],
      foreignColumns: [invoices.id],
      name: "transactions_invoice_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.orderId],
      foreignColumns: [orders.id],
      name: "transactions_order_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transactions_team_id_fkey",
    }).onDelete("cascade"),
    unique("transactions_transaction_number_key").on(table.transactionNumber),
    unique("transactions_internal_id_unique").on(table.internalId),
    pgPolicy("transactions_select", {
      as: "permissive",
      for: "select",
      to: ["authenticated"],
      using: sql`(team_id = ANY (private.get_teams_for_authenticated_user()))`,
    }),
    check("check_positive_transaction_amount", sql`amount > (0)::numeric`),
    check(
      "check_valid_transaction_status",
      sql`(status)::text = ANY (ARRAY[('pending'::character varying)::text, ('completed'::character varying)::text, ('failed'::character varying)::text, ('cancelled'::character varying)::text])`
    ),
    check(
      "check_valid_transaction_type",
      sql`(type)::text = ANY (ARRAY[('payment'::character varying)::text, ('expense'::character varying)::text, ('refund'::character varying)::text, ('adjustment'::character varying)::text])`
    ),
  ]
);

export const transactionCategories = pgTable(
  "transaction_categories",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    name: text().notNull(),
    slug: text().notNull(),
    color: text(),
    description: text(),
    parentId: uuid("parent_id"),
    system: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    taxRate: numeric("tax_rate", { precision: 10, scale: 2 }),
    taxType: text("tax_type"),
    taxReportingCode: text("tax_reporting_code"),
    excluded: boolean().default(false).notNull(),
  },
  (table) => [
    index("idx_transaction_categories_parent_id")
      .using("btree", table.parentId.asc().nullsLast().op("uuid_ops"))
      .where(sql`(parent_id IS NOT NULL)`),
    index("idx_transaction_categories_slug").using(
      "btree",
      table.slug.asc().nullsLast().op("text_ops")
    ),
    index("idx_transaction_categories_system")
      .using("btree", table.system.asc().nullsLast().op("bool_ops"))
      .where(sql`(system = true)`),
    index("idx_transaction_categories_team_id").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.parentId],
      foreignColumns: [table.id],
      name: "transaction_categories_parent_id_fkey",
    }).onDelete("set null"),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transaction_categories_team_id_fkey",
    }).onDelete("cascade"),
    unique("unique_category_slug_per_team").on(table.teamId, table.slug),
  ]
);

export const financialAccounts = pgTable(
  "financial_accounts",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    type: varchar({ length: 32 }).notNull(),
    name: text().notNull(),
    currency: varchar({ length: 3 }).default("GHS").notNull(),
    provider: varchar({ length: 64 }),
    externalId: text("external_id"),
    status: varchar({ length: 32 }).default("active").notNull(),
    openingBalance: numeric("opening_balance", { precision: 12, scale: 2 }),
    syncCursor: text("sync_cursor"),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_fin_accounts_status").using("btree", table.status.asc().nullsLast().op("text_ops")),
    index("idx_fin_accounts_team_id").using("btree", table.teamId.asc().nullsLast().op("uuid_ops")),
    index("uq_fin_accounts_team_name").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops"),
      table.name.asc().nullsLast().op("uuid_ops")
    ),
    index("uq_fin_accounts_team_provider_external").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops"),
      table.provider.asc().nullsLast().op("text_ops"),
      table.externalId.asc().nullsLast().op("text_ops")
    ),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "financial_accounts_team_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const transactionEmbeddings = pgTable(
  "transaction_embeddings",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    embedding: vector({ dimensions: 768 }),
    sourceText: text("source_text").notNull(),
    model: text().default("gemini-embedding-001").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transaction_embeddings_team_id").using(
      "btree",
      table.teamId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_embeddings_transaction_id").using(
      "btree",
      table.transactionId.asc().nullsLast().op("uuid_ops")
    ),
    index("idx_transaction_embeddings_vector")
      .using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops"))
      .with({ m: "16", ef_construction: "64" }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transaction_embeddings_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_embeddings_transaction_id_fkey",
    }).onDelete("cascade"),
    unique("unique_transaction_embedding").on(table.transactionId),
  ]
);

export const transactionCategoryEmbeddings = pgTable(
  "transaction_category_embeddings",
  {
    name: text().primaryKey().notNull(),
    embedding: vector({ dimensions: 768 }),
    model: text().default("gemini-embedding-001").notNull(),
    system: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transaction_category_embeddings_system").using(
      "btree",
      table.system.asc().nullsLast().op("bool_ops")
    ),
    index("idx_transaction_category_embeddings_vector")
      .using("hnsw", table.embedding.asc().nullsLast().op("vector_cosine_ops"))
      .with({ m: "16", ef_construction: "64" }),
  ]
);

export const transactionEnrichments = pgTable(
  "transaction_enrichments",
  {
    id: uuid().defaultRandom().primaryKey().notNull(),
    teamId: uuid("team_id").notNull(),
    transactionId: uuid("transaction_id").notNull(),
    suggestedCategorySlug: text("suggested_category_slug"),
    confidence: numeric({ precision: 3, scale: 2 }),
    metadata: jsonb(),
    reviewed: boolean().default(false).notNull(),
    createdAt: timestamp("created_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [
    index("idx_transaction_enrichments_reviewed")
      .using("btree", table.reviewed.asc().nullsLast().op("bool_ops"))
      .where(sql`(reviewed = false)`),
    index("idx_transaction_enrichments_transaction_id").using(
      "btree",
      table.transactionId.asc().nullsLast().op("uuid_ops")
    ),
    foreignKey({
      columns: [table.teamId, table.suggestedCategorySlug],
      foreignColumns: [transactionCategories.teamId, transactionCategories.slug],
      name: "fk_suggested_category",
    }),
    foreignKey({
      columns: [table.teamId],
      foreignColumns: [teams.id],
      name: "transaction_enrichments_team_id_fkey",
    }).onDelete("cascade"),
    foreignKey({
      columns: [table.transactionId],
      foreignColumns: [transactions.id],
      name: "transaction_enrichments_transaction_id_fkey",
    }).onDelete("cascade"),
  ]
);

export const teamOrderCounters = pgTable(
  "team_order_counters",
  {
    teamId: uuid("team_id").notNull(),
    year: integer().notNull(),
    counter: integer().default(0).notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" })
      .defaultNow()
      .notNull(),
  },
  (table) => [primaryKey({ columns: [table.teamId, table.year], name: "team_order_counters_pkey" })]
);
export const transactionsIncome = pgView("transactions_income", {
  id: uuid(),
  orderId: uuid("order_id"),
  invoiceId: uuid("invoice_id"),
  clientId: uuid("client_id"),
  transactionNumber: varchar("transaction_number", { length: 50 }),
  type: transactionType(),
  category: varchar({ length: 100 }),
  amount: numeric({ precision: 10, scale: 2 }),
  currency: varchar({ length: 3 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  description: text(),
  notes: text(),
  transactionDate: timestamp("transaction_date", { withTimezone: true, mode: "string" }),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }),
  status: transactionStatus(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  teamId: uuid("team_id"),
  clientName: text("client_name"),
  orderNumber: varchar("order_number", { length: 50 }),
  invoiceNumber: varchar("invoice_number", { length: 50 }),
}).as(
  sql`SELECT t.id, t.order_id, t.invoice_id, t.client_id, t.transaction_number, t.type, t.category, t.amount, t.currency, t.payment_method, t.payment_reference, t.description, t.notes, t.transaction_date, t.due_date, t.status, t.created_at, t.updated_at, t.deleted_at, t.team_id, c.name AS client_name, o.order_number, i.invoice_number FROM transactions t LEFT JOIN clients c ON t.client_id = c.id LEFT JOIN orders o ON t.order_id = o.id LEFT JOIN invoices i ON t.invoice_id = i.id WHERE t.type = 'payment'::transaction_type AND t.status = 'completed'::transaction_status AND t.deleted_at IS NULL`
);

export const financialSummary = pgView("financial_summary", {
  month: timestamp({ withTimezone: true, mode: "string" }),
  totalIncome: numeric("total_income"),
  totalExpenses: numeric("total_expenses"),
  netProfit: numeric("net_profit"),
}).as(
  sql`SELECT date_trunc('month'::text, transaction_date) AS month, sum( CASE WHEN type = 'payment'::transaction_type AND status = 'completed'::transaction_status THEN amount ELSE 0::numeric END) AS total_income, sum( CASE WHEN type = 'expense'::transaction_type AND status = 'completed'::transaction_status THEN amount ELSE 0::numeric END) AS total_expenses, sum( CASE WHEN type = 'payment'::transaction_type AND status = 'completed'::transaction_status THEN amount WHEN type = 'expense'::transaction_type AND status = 'completed'::transaction_status THEN - amount ELSE 0::numeric END) AS net_profit FROM transactions WHERE deleted_at IS NULL GROUP BY (date_trunc('month'::text, transaction_date)) ORDER BY (date_trunc('month'::text, transaction_date)) DESC`
);

export const transactionsExpenses = pgView("transactions_expenses", {
  id: uuid(),
  orderId: uuid("order_id"),
  invoiceId: uuid("invoice_id"),
  clientId: uuid("client_id"),
  transactionNumber: varchar("transaction_number", { length: 50 }),
  type: transactionType(),
  category: varchar({ length: 100 }),
  amount: numeric({ precision: 10, scale: 2 }),
  currency: varchar({ length: 3 }),
  paymentMethod: varchar("payment_method", { length: 50 }),
  paymentReference: varchar("payment_reference", { length: 100 }),
  description: text(),
  notes: text(),
  transactionDate: timestamp("transaction_date", { withTimezone: true, mode: "string" }),
  dueDate: timestamp("due_date", { withTimezone: true, mode: "string" }),
  status: transactionStatus(),
  createdAt: timestamp("created_at", { withTimezone: true, mode: "string" }),
  updatedAt: timestamp("updated_at", { withTimezone: true, mode: "string" }),
  deletedAt: timestamp("deleted_at", { withTimezone: true, mode: "string" }),
  teamId: uuid("team_id"),
  clientName: text("client_name"),
}).as(
  sql`SELECT t.id, t.order_id, t.invoice_id, t.client_id, t.transaction_number, t.type, t.category, t.amount, t.currency, t.payment_method, t.payment_reference, t.description, t.notes, t.transaction_date, t.due_date, t.status, t.created_at, t.updated_at, t.deleted_at, t.team_id, c.name AS client_name FROM transactions t LEFT JOIN clients c ON t.client_id = c.id WHERE t.type = 'expense'::transaction_type AND t.status = 'completed'::transaction_status AND t.deleted_at IS NULL`
);
