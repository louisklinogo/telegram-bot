# Transactions System Improvement Plan

**Status:** Planning Phase  
**Priority:** High  
**Reference:** Midday Production Implementation  
**Last Updated:** 2025-01-XX

---

## 📋 Executive Summary

Our transactions system needs significant upgrades to match production-grade standards. This document outlines improvements across **schema design**, **UI/UX**, **performance**, and **features** following Midday's proven patterns.

### Current State
- ✅ Basic CRUD operations working
- ✅ Server Components + initialData pattern (optimal)
- ✅ Payment allocation to invoices
- ⚠️ Limited filtering and search
- ❌ No bulk operations
- ❌ No tags/attachments system
- ❌ Poor indexing (1 index only)
- ❌ No AI categorization
- ❌ No export functionality

### Target State (Midday-level)
- ✅ Advanced filtering (10+ dimensions)
- ✅ AI-powered search
- ✅ Bulk actions (categories, tags, status)
- ✅ Tags system (flexible labeling)
- ✅ Attachments (receipts/invoices)
- ✅ Auto-categorization (AI embeddings)
- ✅ Export to CSV
- ✅ Keyboard shortcuts
- ✅ 13+ optimized indexes
- ✅ Full-text search with fuzzy matching

---

## 🎯 Gap Analysis

### Schema Gaps (Critical)

| Feature | Current | Midday | Impact | Priority |
|---------|---------|--------|--------|----------|
| **Enums** | ❌ Strings | ✅ PG ENUMs | Type safety, validation | 🔴 Critical |
| **Date Handling** | ⚠️ Mixed timestamp | ✅ Separate date + createdAt | Accounting accuracy | 🔴 Critical |
| **Full-Text Search** | ❌ None | ✅ FTS + Trigram | Search speed 100x | 🔴 Critical |
| **Indexes** | 🔴 1 index | ✅ 13 indexes | Query performance | 🔴 Critical |
| **Tags** | ❌ None | ✅ Many-to-many | Flexible labeling | 🟡 High |
| **Attachments** | ⚠️ Weak link | ✅ Dedicated table | Receipt tracking | 🟡 High |
| **Categories** | ⚠️ String field | ✅ Hierarchical FK | Organization | 🟡 High |
| **AI Enrichment** | ❌ None | ✅ Embeddings table | Auto-categorize | 🟢 Medium |
| **User Assignment** | ❌ None | ✅ assignedId FK | Team collaboration | 🟢 Medium |
| **Recurring** | ❌ None | ✅ frequency field | Budget forecasting | 🟢 Medium |
| **Currency** | ⚠️ Manual | ✅ Auto-convert | Multi-currency | 🟢 Medium |
| **Bank Integration** | ❌ None | ✅ Full support | Auto-sync | 🟢 Low |

### UI/UX Gaps (High Priority)

| Feature | Current | Midday | Impact | Priority |
|---------|---------|--------|--------|----------|
| **Bulk Selection** | ❌ None | ✅ Checkbox + actions | Productivity 10x | 🔴 Critical |
| **Advanced Filters** | ❌ Basic tabs | ✅ 10+ filters | Findability | 🔴 Critical |
| **Column Visibility** | ❌ Fixed | ✅ Toggleable | Customization | 🟡 High |
| **Sticky Columns** | ❌ None | ✅ 3 sticky cols | UX on wide tables | 🟡 High |
| **Keyboard Nav** | ❌ None | ✅ Arrow keys, ESC | Power users | 🟡 High |
| **Export** | ❌ None | ✅ CSV export | Accounting | 🟡 High |
| **AI Search** | ❌ None | ✅ Natural language | Ease of use | 🟢 Medium |
| **Filter Chips** | ❌ None | ✅ Visual chips | Clarity | 🟢 Medium |
| **Bottom Bar** | ❌ None | ✅ Filtered totals | Context | 🟢 Medium |
| **Empty States** | ⚠️ Basic | ✅ Contextual + actions | Onboarding | 🟢 Low |

---

## 🗄️ Schema Improvements

### Phase 1: Core Enhancements (Week 1-2)

#### 1.1 Create Enums

```sql
-- Migration: 0006_add_transaction_enums.sql

-- Transaction method enum
CREATE TYPE transaction_method AS ENUM (
  'cash',
  'bank_transfer',
  'mobile_money',
  'card',
  'cheque',
  'other'
);

-- Transaction status enum
CREATE TYPE transaction_status AS ENUM (
  'pending',
  'completed',
  'failed',
  'refunded',
  'archived',
  'excluded'
);

-- Transaction frequency enum (for recurring)
CREATE TYPE transaction_frequency AS ENUM (
  'weekly',
  'biweekly',
  'monthly',
  'semi_monthly',
  'annually',
  'irregular'
);
```

#### 1.2 Alter Transactions Table

```sql
-- Migration: 0007_enhance_transactions_table.sql

ALTER TABLE transactions
  -- 1. Separate accounting date from creation timestamp
  ADD COLUMN date DATE,
  
  -- 2. Rename for clarity (keep old for now)
  ADD COLUMN name TEXT, -- Short title (was description)
  -- description remains for longer details
  
  -- 3. Add missing core fields
  ADD COLUMN internal_id TEXT, -- For deduplication
  ADD COLUMN assigned_id UUID REFERENCES users(id) ON DELETE SET NULL,
  ADD COLUMN counterparty_name TEXT, -- Who paid/received
  ADD COLUMN merchant_name TEXT, -- Extracted from description
  ADD COLUMN manual BOOLEAN DEFAULT false,
  ADD COLUMN balance NUMERIC(10,2), -- Running balance
  
  -- 4. AI enrichment preparation
  ADD COLUMN enrichment_completed BOOLEAN DEFAULT false,
  
  -- 5. Recurring transactions
  ADD COLUMN recurring BOOLEAN DEFAULT false,
  ADD COLUMN frequency transaction_frequency,
  
  -- 6. Currency conversion (multi-currency support)
  ADD COLUMN base_amount NUMERIC(10,2),
  ADD COLUMN base_currency VARCHAR(3);

-- 7. Populate new fields from existing data
UPDATE transactions 
SET 
  date = transaction_date::date,
  name = COALESCE(description, 'Transaction'),
  internal_id = 'manual_' || id::text,
  manual = true;

-- 8. Make non-nullable after population
ALTER TABLE transactions 
  ALTER COLUMN date SET NOT NULL,
  ALTER COLUMN name SET NOT NULL,
  ALTER COLUMN internal_id SET NOT NULL;

-- 9. Add unique constraint
ALTER TABLE transactions 
  ADD CONSTRAINT transactions_internal_id_unique UNIQUE(internal_id);

-- 10. Replace string columns with enums (requires data migration)
-- Note: Adjust existing data first!
UPDATE transactions SET payment_method = 'other' WHERE payment_method NOT IN ('cash', 'bank_transfer', 'mobile_money', 'card', 'cheque', 'other');
UPDATE transactions SET status = 'completed' WHERE status NOT IN ('pending', 'completed', 'failed', 'refunded', 'archived', 'excluded');

ALTER TABLE transactions
  ALTER COLUMN payment_method TYPE transaction_method USING payment_method::transaction_method,
  ALTER COLUMN status TYPE transaction_status USING status::transaction_status;
```

#### 1.3 Add Full-Text Search

```sql
-- Migration: 0008_add_fts_to_transactions.sql

-- Enable extensions
CREATE EXTENSION IF NOT EXISTS pg_trgm; -- Trigram similarity
CREATE EXTENSION IF NOT EXISTS btree_gin; -- Better GIN indexes

-- Add FTS generated column
ALTER TABLE transactions 
  ADD COLUMN fts_vector tsvector 
  GENERATED ALWAYS AS (
    to_tsvector('english', 
      COALESCE(name, '') || ' ' || 
      COALESCE(description, '') || ' ' || 
      COALESCE(counterparty_name, '') || ' ' ||
      COALESCE(category, '')
    )
  ) STORED;

-- Create FTS indexes
CREATE INDEX idx_transactions_fts 
  ON transactions USING GIN(fts_vector);

-- Trigram index for fuzzy name search
CREATE INDEX idx_transactions_name_trigram 
  ON transactions USING GIN(name gin_trgm_ops);
```

#### 1.4 Add Performance Indexes

```sql
-- Migration: 0009_add_transaction_indexes.sql

-- Core indexes
CREATE INDEX idx_transactions_team_date 
  ON transactions(team_id, date DESC);

CREATE INDEX idx_transactions_date 
  ON transactions(date DESC);

CREATE INDEX idx_transactions_assigned_id 
  ON transactions(assigned_id) 
  WHERE assigned_id IS NOT NULL;

CREATE INDEX idx_transactions_client_id 
  ON transactions(client_id) 
  WHERE client_id IS NOT NULL;

CREATE INDEX idx_transactions_category 
  ON transactions(category);

-- Composite indexes for common queries
CREATE INDEX idx_transactions_team_status_date 
  ON transactions(team_id, status, date DESC);

CREATE INDEX idx_transactions_team_type_date 
  ON transactions(team_id, type, date DESC);

-- Invoice/order lookups
CREATE INDEX idx_transactions_invoice_id 
  ON transactions(invoice_id) 
  WHERE invoice_id IS NOT NULL;

CREATE INDEX idx_transactions_order_id 
  ON transactions(order_id) 
  WHERE order_id IS NOT NULL;

-- For pagination
CREATE INDEX idx_transactions_team_pagination 
  ON transactions(team_id, date DESC, id DESC);
```

### Phase 2: Related Tables (Week 3-4)

#### 2.1 Transaction Categories (Hierarchical)

```sql
-- Migration: 0010_create_transaction_categories.sql

CREATE TABLE transaction_categories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  slug TEXT NOT NULL,
  color TEXT, -- Hex color for UI (#00C969 for income, etc.)
  description TEXT,
  parent_id UUID REFERENCES transaction_categories(id) ON DELETE SET NULL,
  system BOOLEAN DEFAULT false, -- System-provided vs user-created
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_category_slug_per_team UNIQUE(team_id, slug)
);

CREATE INDEX idx_transaction_categories_team_id 
  ON transaction_categories(team_id);

CREATE INDEX idx_transaction_categories_parent_id 
  ON transaction_categories(parent_id);

CREATE INDEX idx_transaction_categories_slug 
  ON transaction_categories(slug);

-- Seed system categories
INSERT INTO transaction_categories (team_id, name, slug, color, system)
SELECT 
  t.id as team_id,
  cat.name,
  cat.slug,
  cat.color,
  true as system
FROM teams t
CROSS JOIN (
  VALUES 
    ('Income', 'income', '#00C969'),
    ('Salary', 'salary', '#00C969'),
    ('Sales', 'sales', '#00C969'),
    ('Expenses', 'expenses', '#FF4444'),
    ('Office Supplies', 'office-supplies', '#FF6B6B'),
    ('Software', 'software', '#4A90E2'),
    ('Travel', 'travel', '#F5A623'),
    ('Meals', 'meals', '#F8E71C'),
    ('Utilities', 'utilities', '#7ED321'),
    ('Marketing', 'marketing', '#BD10E0'),
    ('Equipment', 'equipment', '#50E3C2'),
    ('Inventory', 'inventory', '#B8E986'),
    ('Taxes', 'taxes', '#9013FE'),
    ('Refunds', 'refunds', '#FF9500')
) AS cat(name, slug, color);

-- Add category relationships to transactions
ALTER TABLE transactions
  ADD COLUMN category_slug TEXT,
  ADD CONSTRAINT fk_transactions_category 
    FOREIGN KEY (team_id, category_slug) 
    REFERENCES transaction_categories(team_id, slug) 
    ON DELETE SET NULL;

CREATE INDEX idx_transactions_category_slug 
  ON transactions(category_slug);

-- Migrate existing category strings to slugs (best effort)
UPDATE transactions t
SET category_slug = (
  SELECT slug 
  FROM transaction_categories tc 
  WHERE tc.team_id = t.team_id 
    AND LOWER(tc.name) = LOWER(t.category)
  LIMIT 1
);
```

#### 2.2 Transaction Tags

```sql
-- Migration: 0011_create_transaction_tags.sql

CREATE TABLE transaction_tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  tag_id UUID NOT NULL REFERENCES tags(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_transaction_tag UNIQUE(transaction_id, tag_id)
);

CREATE INDEX idx_transaction_tags_transaction_id 
  ON transaction_tags(transaction_id);

CREATE INDEX idx_transaction_tags_tag_id 
  ON transaction_tags(tag_id);

CREATE INDEX idx_transaction_tags_team_id 
  ON transaction_tags(team_id);

-- Composite index for filtering
CREATE INDEX idx_transaction_tags_team_transaction_tag 
  ON transaction_tags(team_id, transaction_id, tag_id);

-- Add tags table if not exists
CREATE TABLE IF NOT EXISTS tags (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  color TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_tag_name_per_team UNIQUE(team_id, name)
);

CREATE INDEX idx_tags_team_id ON tags(team_id);
```

#### 2.3 Transaction Attachments

```sql
-- Migration: 0012_create_transaction_attachments.sql

CREATE TABLE transaction_attachments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  path TEXT[] NOT NULL, -- Supabase storage path array
  type TEXT, -- 'receipt', 'invoice', 'contract', 'other'
  mime_type TEXT, -- 'image/jpeg', 'application/pdf', etc.
  size BIGINT, -- File size in bytes
  checksum TEXT, -- For deduplication
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  uploaded_by UUID REFERENCES users(id) ON DELETE SET NULL
);

CREATE INDEX idx_transaction_attachments_transaction_id 
  ON transaction_attachments(transaction_id);

CREATE INDEX idx_transaction_attachments_team_id 
  ON transaction_attachments(team_id);

CREATE INDEX idx_transaction_attachments_type 
  ON transaction_attachments(type);

-- For deduplication
CREATE INDEX idx_transaction_attachments_checksum 
  ON transaction_attachments(checksum) 
  WHERE checksum IS NOT NULL;
```

### Phase 3: AI Infrastructure (Week 5-6, Optional)

#### 3.1 Vector Extension & Embeddings

```sql
-- Migration: 0013_add_ai_embeddings.sql

-- Enable pgvector extension
CREATE EXTENSION IF NOT EXISTS vector;

-- Transaction embeddings for similarity search
CREATE TABLE transaction_embeddings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  embedding VECTOR(768), -- Gemini/OpenAI embedding dimensions
  source_text TEXT NOT NULL, -- Text that was embedded
  model TEXT DEFAULT 'gemini-embedding-001' NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT unique_transaction_embedding UNIQUE(transaction_id)
);

CREATE INDEX idx_transaction_embeddings_transaction_id 
  ON transaction_embeddings(transaction_id);

CREATE INDEX idx_transaction_embeddings_team_id 
  ON transaction_embeddings(team_id);

-- HNSW index for fast vector similarity search
CREATE INDEX idx_transaction_embeddings_vector 
  ON transaction_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

-- Category embeddings for similarity matching
CREATE TABLE transaction_category_embeddings (
  name TEXT PRIMARY KEY,
  embedding VECTOR(768),
  model TEXT DEFAULT 'gemini-embedding-001' NOT NULL,
  system BOOLEAN DEFAULT false NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  updated_at TIMESTAMPTZ DEFAULT NOW() NOT NULL
);

CREATE INDEX idx_transaction_category_embeddings_vector 
  ON transaction_category_embeddings 
  USING hnsw (embedding vector_cosine_ops)
  WITH (m = 16, ef_construction = 64);

CREATE INDEX idx_transaction_category_embeddings_system 
  ON transaction_category_embeddings(system);

-- Enrichment tracking table
CREATE TABLE transaction_enrichments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  team_id UUID NOT NULL REFERENCES teams(id) ON DELETE CASCADE,
  transaction_id UUID NOT NULL REFERENCES transactions(id) ON DELETE CASCADE,
  suggested_category_slug TEXT,
  confidence NUMERIC(3,2), -- 0.00 to 1.00
  metadata JSONB, -- Additional AI-extracted data
  reviewed BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW() NOT NULL,
  
  CONSTRAINT fk_suggested_category 
    FOREIGN KEY (team_id, suggested_category_slug) 
    REFERENCES transaction_categories(team_id, slug)
);

CREATE INDEX idx_transaction_enrichments_transaction_id 
  ON transaction_enrichments(transaction_id);

CREATE INDEX idx_transaction_enrichments_reviewed 
  ON transaction_enrichments(reviewed) 
  WHERE NOT reviewed;
```

---

## 🗃️ Drizzle Schema Updates

Update `packages/database/src/schema.ts`:

```typescript
// Add at top with other imports
import { sql } from "drizzle-orm";

// Define enums
export const transactionMethodEnum = pgEnum("transaction_method", [
  "cash",
  "bank_transfer",
  "mobile_money",
  "card",
  "cheque",
  "other",
]);

export const transactionStatusEnum = pgEnum("transaction_status", [
  "pending",
  "completed",
  "failed",
  "refunded",
  "archived",
  "excluded",
]);

export const transactionFrequencyEnum = pgEnum("transaction_frequency", [
  "weekly",
  "biweekly",
  "monthly",
  "semi_monthly",
  "annually",
  "irregular",
]);

// Update transactions table
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    
    // Core fields
    date: date("date").notNull(), // NEW: Accounting date
    name: text("name").notNull(), // NEW: Transaction name/title
    description: text("description"), // Longer details
    internalId: text("internal_id").notNull().unique(), // NEW: For deduplication
    
    // Financial
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("GHS").notNull(),
    balance: numeric("balance", { precision: 10, scale: 2 }), // NEW: Running balance
    baseAmount: numeric("base_amount", { precision: 10, scale: 2 }), // NEW: Converted amount
    baseCurrency: varchar("base_currency", { length: 3 }), // NEW: Team base currency
    
    // Classification
    type: varchar("type", { length: 50 }).notNull(),
    categorySlug: text("category_slug"), // NEW: FK to categories
    category: varchar("category", { length: 100 }), // DEPRECATED: Keep for migration
    paymentMethod: transactionMethodEnum("payment_method"), // NEW: Enum
    status: transactionStatusEnum("status").default("completed").notNull(), // NEW: Enum
    
    // Relationships
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    assignedId: uuid("assigned_id").references(() => users.id, { onDelete: "set null" }), // NEW
    
    // Metadata
    counterpartyName: text("counterparty_name"), // NEW: Who paid/received
    merchantName: text("merchant_name"), // NEW: Extracted merchant
    paymentReference: varchar("payment_reference", { length: 100 }),
    notes: text("notes"),
    manual: boolean("manual").default(false), // NEW: User-created vs imported
    
    // Recurring
    recurring: boolean("recurring").default(false), // NEW
    frequency: transactionFrequencyEnum("frequency"), // NEW
    
    // AI enrichment
    enrichmentCompleted: boolean("enrichment_completed").default(false), // NEW
    
    // Timestamps
    transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
  },
  (table) => ({
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
    teamTypeIdx: index("idx_transactions_team_type_date").on(
      table.teamId,
      table.type,
      table.date
    ),
  })
);

// Transaction Categories
export const transactionCategories = pgTable(
  "transaction_categories",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
    name: text("name").notNull(),
    slug: text("slug").notNull(),
    color: text("color"),
    description: text("description"),
    parentId: uuid("parent_id").references((): any => transactionCategories.id, {
      onDelete: "set null",
    }),
    system: boolean("system").default(false).notNull(),
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

// Transaction Tags
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

// Transaction Attachments
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
    path: text("path").array().notNull(),
    type: text("type"),
    mimeType: text("mime_type"),
    size: numeric("size", { precision: 20, scale: 0 }),
    checksum: text("checksum"),
    uploadedBy: uuid("uploaded_by").references(() => users.id, { onDelete: "set null" }),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
  },
  (table) => ({
    transactionIdx: index("idx_transaction_attachments_transaction_id").on(
      table.transactionId
    ),
    teamIdx: index("idx_transaction_attachments_team_id").on(table.teamId),
    typeIdx: index("idx_transaction_attachments_type").on(table.type),
    checksumIdx: index("idx_transaction_attachments_checksum").on(table.checksum),
  })
);

// Relations
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
  category: one(transactionCategories, {
    fields: [transactions.teamId, transactions.categorySlug],
    references: [transactionCategories.teamId, transactionCategories.slug],
  }),
  tags: many(transactionTags),
  attachments: many(transactionAttachments),
  allocations: many(transactionAllocations),
}));

export const transactionCategoriesRelations = relations(
  transactionCategories,
  ({ one, many }) => ({
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
  })
);

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

export const transactionAttachmentsRelations = relations(
  transactionAttachments,
  ({ one }) => ({
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
  })
);
```

---

## 🔧 Database Query Updates

Update `packages/database/src/queries/transactions.ts`:

```typescript
import { and, desc, eq, isNull, sql, lt, or, gte, lte, inArray, ilike } from "drizzle-orm";
import type { DbClient } from "../client";
import { 
  transactions, 
  clients, 
  transactionCategories,
  transactionTags,
  transactionAttachments,
  tags,
} from "../schema";

// Enhanced query with joins
export async function getTransactionsEnriched(
  db: DbClient,
  params: {
    teamId: string;
    type?: "payment" | "expense" | "refund" | "adjustment";
    status?: string[];
    categories?: string[];
    tags?: string[];
    assignedId?: string;
    search?: string;
    startDate?: Date;
    endDate?: Date;
    hasAttachments?: boolean;
    limit?: number;
    cursor?: { date: Date | null; id: string } | null;
  },
) {
  const {
    teamId,
    type,
    status,
    categories,
    tags: tagIds,
    assignedId,
    search,
    startDate,
    endDate,
    hasAttachments,
    limit = 50,
    cursor,
  } = params;

  // Base query with joins
  let query = db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      // Aggregate tags and attachments
      tags: sql<any[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${tags.id},
              'name', ${tags.name}
            )
          ) FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'::json
        )
      `,
      attachmentCount: sql<number>`
        COUNT(DISTINCT ${transactionAttachments.id})
      `,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .leftJoin(transactionAttachments, eq(transactions.id, transactionAttachments.transactionId))
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        type ? eq(transactions.type, type) : sql`true`,
        status && status.length > 0 ? inArray(transactions.status, status as any) : sql`true`,
        categories && categories.length > 0
          ? inArray(transactions.categorySlug, categories)
          : sql`true`,
        assignedId ? eq(transactions.assignedId, assignedId) : sql`true`,
        search
          ? or(
              ilike(transactions.name, `%${search}%`),
              ilike(transactions.description, `%${search}%`),
              ilike(transactions.counterpartyName, `%${search}%`)
            )
          : sql`true`,
        startDate ? gte(transactions.date, startDate) : sql`true`,
        endDate ? lte(transactions.date, endDate) : sql`true`,
        cursor?.date
          ? or(
              lt(transactions.date, cursor.date),
              and(eq(transactions.date, cursor.date), lt(transactions.id, cursor.id))
            )
          : sql`true`
      )
    )
    .groupBy(
      transactions.id,
      clients.id,
      transactionCategories.id
    )
    .orderBy(desc(transactions.date), desc(transactions.id))
    .limit(limit);

  // Apply attachment filter (requires having clause)
  if (hasAttachments !== undefined) {
    if (hasAttachments) {
      query = query.having(sql`COUNT(DISTINCT ${transactionAttachments.id}) > 0`);
    } else {
      query = query.having(sql`COUNT(DISTINCT ${transactionAttachments.id}) = 0`);
    }
  }

  // Apply tag filter (if specified)
  if (tagIds && tagIds.length > 0) {
    query = query.having(
      sql`COUNT(DISTINCT ${tags.id}) FILTER (WHERE ${tags.id} = ANY(ARRAY[${tagIds}]::uuid[])) > 0`
    );
  }

  return await query;
}

// Full-text search query
export async function searchTransactions(
  db: DbClient,
  params: {
    teamId: string;
    query: string;
    limit?: number;
  }
) {
  const { teamId, query, limit = 20 } = params;

  return await db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      rank: sql<number>`ts_rank(fts_vector, plainto_tsquery('english', ${query}))`,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .where(
      and(
        eq(transactions.teamId, teamId),
        isNull(transactions.deletedAt),
        sql`fts_vector @@ plainto_tsquery('english', ${query})`
      )
    )
    .orderBy(sql`ts_rank(fts_vector, plainto_tsquery('english', ${query})) DESC`)
    .limit(limit);
}

// Bulk update transactions
export async function updateTransactionsBulk(
  db: DbClient,
  params: {
    teamId: string;
    transactionIds: string[];
    updates: {
      categorySlug?: string;
      status?: string;
      assignedId?: string | null;
      recurring?: boolean;
      frequency?: string | null;
    };
  }
) {
  const { teamId, transactionIds, updates } = params;

  return await db
    .update(transactions)
    .set({
      ...updates,
      updatedAt: new Date(),
    })
    .where(
      and(
        eq(transactions.teamId, teamId),
        inArray(transactions.id, transactionIds),
        isNull(transactions.deletedAt)
      )
    )
    .returning();
}

// Get transaction with full details (for detail sheet)
export async function getTransactionById(
  db: DbClient,
  params: {
    teamId: string;
    transactionId: string;
  }
) {
  const { teamId, transactionId } = params;

  const result = await db
    .select({
      transaction: transactions,
      client: clients,
      category: transactionCategories,
      assignedUser: users,
      tags: sql<any[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${tags.id},
              'name', ${tags.name},
              'color', ${tags.color}
            )
          ) FILTER (WHERE ${tags.id} IS NOT NULL),
          '[]'::json
        )
      `,
      attachments: sql<any[]>`
        COALESCE(
          json_agg(
            DISTINCT jsonb_build_object(
              'id', ${transactionAttachments.id},
              'name', ${transactionAttachments.name},
              'type', ${transactionAttachments.type},
              'size', ${transactionAttachments.size},
              'path', ${transactionAttachments.path}
            )
          ) FILTER (WHERE ${transactionAttachments.id} IS NOT NULL),
          '[]'::json
        )
      `,
    })
    .from(transactions)
    .leftJoin(clients, eq(transactions.clientId, clients.id))
    .leftJoin(
      transactionCategories,
      and(
        eq(transactions.teamId, transactionCategories.teamId),
        eq(transactions.categorySlug, transactionCategories.slug)
      )
    )
    .leftJoin(users, eq(transactions.assignedId, users.id))
    .leftJoin(transactionTags, eq(transactions.id, transactionTags.transactionId))
    .leftJoin(tags, eq(transactionTags.tagId, tags.id))
    .leftJoin(transactionAttachments, eq(transactions.id, transactionAttachments.transactionId))
    .where(
      and(
        eq(transactions.teamId, teamId),
        eq(transactions.id, transactionId),
        isNull(transactions.deletedAt)
      )
    )
    .groupBy(
      transactions.id,
      clients.id,
      transactionCategories.id,
      users.id
    )
    .limit(1);

  return result[0];
}

// Get categories (hierarchical)
export async function getTransactionCategories(
  db: DbClient,
  params: {
    teamId: string;
  }
) {
  const { teamId } = params;

  const allCategories = await db
    .select()
    .from(transactionCategories)
    .where(eq(transactionCategories.teamId, teamId))
    .orderBy(transactionCategories.name);

  // Build hierarchy
  const categoryMap = new Map();
  const roots: any[] = [];

  for (const cat of allCategories) {
    categoryMap.set(cat.id, { ...cat, children: [] });
  }

  for (const cat of allCategories) {
    const node = categoryMap.get(cat.id);
    if (cat.parentId) {
      const parent = categoryMap.get(cat.parentId);
      if (parent) {
        parent.children.push(node);
      }
    } else {
      roots.push(node);
    }
  }

  return roots;
}
```

---

## 🎨 UI/UX Improvements

### Phase 1: Bulk Actions (Week 1)

#### Components to Create

**1. `apps/admin/src/components/transactions/bulk-actions.tsx`**
```typescript
"use client";

import { trpc } from "@/lib/trpc/client";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { useToast } from "@/components/ui/use-toast";
import { useQueryClient } from "@tanstack/react-query";
import { SelectCategory } from "./select-category";

type BulkActionsProps = {
  selectedIds: string[];
  onClearSelection: () => void;
};

export function BulkActions({ selectedIds, onClearSelection }: BulkActionsProps) {
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const utils = trpc.useUtils();

  const updateMutation = trpc.transactions.updateMany.useMutation({
    onSuccess: () => {
      toast({ title: `Updated ${selectedIds.length} transactions` });
      utils.transactions.list.invalidate();
      utils.transactions.stats.invalidate();
      onClearSelection();
    },
    onError: (error) => {
      toast({ title: "Failed to update", description: error.message, variant: "destructive" });
    },
  });

  const deleteMutation = trpc.transactions.deleteMany.useMutation({
    onSuccess: () => {
      toast({ title: `Deleted ${selectedIds.length} transactions` });
      utils.transactions.list.invalidate();
      utils.transactions.stats.invalidate();
      onClearSelection();
    },
  });

  return (
    <div className="flex items-center gap-2">
      <span className="text-sm text-muted-foreground">
        {selectedIds.length} selected
      </span>

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm">
            Actions
            <Icons.ChevronDown className="ml-2 h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[200px]">
          {/* Category */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Category className="mr-2 h-4 w-4" />
                <span>Category</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-[250px] p-0">
                <SelectCategory
                  onChange={(category) => {
                    updateMutation.mutate({
                      ids: selectedIds,
                      categorySlug: category.slug,
                    });
                  }}
                  headless
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Status */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Status className="mr-2 h-4 w-4" />
                <span>Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {["completed", "pending", "archived"].map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    onCheckedChange={() => {
                      updateMutation.mutate({
                        ids: selectedIds,
                        status: status as any,
                      });
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Delete */}
          <DropdownMenuGroup>
            <DropdownMenuCheckboxItem
              className="text-destructive"
              onCheckedChange={() => {
                if (confirm(`Delete ${selectedIds.length} transactions?`)) {
                  deleteMutation.mutate(selectedIds);
                }
              }}
            >
              <Icons.Delete className="mr-2 h-4 w-4" />
              <span>Delete</span>
            </DropdownMenuCheckboxItem>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
}
```

**2. Update transactions table to add selection**

Update `apps/admin/src/app/(dashboard)/transactions/_components/transactions-view.tsx`:

```typescript
// Add row selection state
const [rowSelection, setRowSelection] = useState<Record<string, boolean>>({});

const table = useReactTable({
  data: filtered,
  columns: [
    // Add selection column first
    {
      id: "select",
      header: ({ table }) => (
        <Checkbox
          checked={table.getIsAllPageRowsSelected()}
          onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        />
      ),
      cell: ({ row }) => (
        <Checkbox
          checked={row.getIsSelected()}
          onCheckedChange={(value) => row.toggleSelected(!!value)}
        />
      ),
    },
    // ... existing columns
  ],
  state: {
    rowSelection,
  },
  onRowSelectionChange: setRowSelection,
  enableRowSelection: true,
  getRowId: (row) => row.trx.id,
});

// Show bulk actions when selections exist
const selectedIds = Object.keys(rowSelection);

return (
  <div>
    {selectedIds.length > 0 && (
      <BulkActions
        selectedIds={selectedIds}
        onClearSelection={() => setRowSelection({})}
      />
    )}
    {/* ... rest of UI */}
  </div>
);
```

### Phase 2: Advanced Filtering (Week 2)

**Create `apps/admin/src/components/transactions/advanced-filter.tsx`:**

```typescript
"use client";

import { useState } from "react";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { formatISO } from "date-fns";

type FilterState = {
  startDate?: Date;
  endDate?: Date;
  status?: string[];
  categories?: string[];
  tags?: string[];
  hasAttachments?: boolean;
};

type AdvancedFilterProps = {
  filters: FilterState;
  onFiltersChange: (filters: FilterState) => void;
  categories?: Array<{ slug: string; name: string }>;
  tags?: Array<{ id: string; name: string }>;
};

export function AdvancedFilter({
  filters,
  onFiltersChange,
  categories = [],
  tags = [],
}: AdvancedFilterProps) {
  const [isOpen, setIsOpen] = useState(false);

  const activeFiltersCount = Object.values(filters).filter(Boolean).length;

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="gap-2">
            <Icons.Filter className="h-4 w-4" />
            Filters
            {activeFiltersCount > 0 && (
              <Badge variant="secondary" className="ml-1">
                {activeFiltersCount}
              </Badge>
            )}
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-[300px]">
          {/* Date Range */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.CalendarMonth className="mr-2 h-4 w-4" />
                <span>Date Range</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="w-auto p-0">
                <Calendar
                  mode="range"
                  selected={{
                    from: filters.startDate,
                    to: filters.endDate,
                  }}
                  onSelect={(range) => {
                    onFiltersChange({
                      ...filters,
                      startDate: range?.from,
                      endDate: range?.to,
                    });
                  }}
                />
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Status */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Status className="mr-2 h-4 w-4" />
                <span>Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                {["completed", "pending", "failed", "archived"].map((status) => (
                  <DropdownMenuCheckboxItem
                    key={status}
                    checked={filters.status?.includes(status)}
                    onCheckedChange={(checked) => {
                      const newStatus = checked
                        ? [...(filters.status || []), status]
                        : (filters.status || []).filter((s) => s !== status);
                      onFiltersChange({ ...filters, status: newStatus });
                    }}
                  >
                    {status.charAt(0).toUpperCase() + status.slice(1)}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Categories */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Category className="mr-2 h-4 w-4" />
                <span>Categories</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {categories.map((cat) => (
                  <DropdownMenuCheckboxItem
                    key={cat.slug}
                    checked={filters.categories?.includes(cat.slug)}
                    onCheckedChange={(checked) => {
                      const newCategories = checked
                        ? [...(filters.categories || []), cat.slug]
                        : (filters.categories || []).filter((c) => c !== cat.slug);
                      onFiltersChange({ ...filters, categories: newCategories });
                    }}
                  >
                    {cat.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Tags */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Tag className="mr-2 h-4 w-4" />
                <span>Tags</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="max-h-[300px] overflow-y-auto">
                {tags.map((tag) => (
                  <DropdownMenuCheckboxItem
                    key={tag.id}
                    checked={filters.tags?.includes(tag.id)}
                    onCheckedChange={(checked) => {
                      const newTags = checked
                        ? [...(filters.tags || []), tag.id]
                        : (filters.tags || []).filter((t) => t !== tag.id);
                      onFiltersChange({ ...filters, tags: newTags });
                    }}
                  >
                    {tag.name}
                  </DropdownMenuCheckboxItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>

          {/* Attachments */}
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Attachments className="mr-2 h-4 w-4" />
                <span>Attachments</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent>
                <DropdownMenuCheckboxItem
                  checked={filters.hasAttachments === true}
                  onCheckedChange={() => {
                    onFiltersChange({
                      ...filters,
                      hasAttachments: filters.hasAttachments === true ? undefined : true,
                    });
                  }}
                >
                  Has attachments
                </DropdownMenuCheckboxItem>
                <DropdownMenuCheckboxItem
                  checked={filters.hasAttachments === false}
                  onCheckedChange={() => {
                    onFiltersChange({
                      ...filters,
                      hasAttachments: filters.hasAttachments === false ? undefined : false,
                    });
                  }}
                >
                  No attachments
                </DropdownMenuCheckboxItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        </DropdownMenuContent>
      </DropdownMenu>

      {/* Active filter chips */}
      {activeFiltersCount > 0 && (
        <Button
          variant="ghost"
          size="sm"
          onClick={() => onFiltersChange({})}
          className="h-8 px-2"
        >
          Clear all
        </Button>
      )}
    </div>
  );
}
```

### Phase 3: Export Functionality (Week 3)

**Create `apps/admin/src/lib/export-transactions.ts`:**

```typescript
import { formatDate } from "date-fns";

type TransactionExport = {
  date: Date;
  name: string;
  description?: string;
  amount: number;
  currency: string;
  type: string;
  category?: string;
  client?: string;
  paymentMethod?: string;
  status: string;
};

export function exportTransactionsToCSV(transactions: TransactionExport[]) {
  const headers = [
    "Date",
    "Name",
    "Description",
    "Amount",
    "Currency",
    "Type",
    "Category",
    "Client",
    "Payment Method",
    "Status",
  ];

  const rows = transactions.map((t) => [
    formatDate(t.date, "yyyy-MM-dd"),
    t.name,
    t.description || "",
    t.amount.toString(),
    t.currency,
    t.type,
    t.category || "",
    t.client || "",
    t.paymentMethod || "",
    t.status,
  ]);

  const csvContent = [
    headers.join(","),
    ...rows.map((row) =>
      row.map((cell) => `"${cell.toString().replace(/"/g, '""')}"`).join(",")
    ),
  ].join("\n");

  // Download
  const blob = new Blob([csvContent], { type: "text/csv;charset=utf-8;" });
  const link = document.createElement("a");
  const url = URL.createObjectURL(blob);
  link.setAttribute("href", url);
  link.setAttribute("download", `transactions-${Date.now()}.csv`);
  link.style.visibility = "hidden";
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}
```

---

## 🔌 tRPC Router Updates

Update `apps/api/src/trpc/routers/transactions.ts`:

```typescript
import { z } from "zod";
import { TRPCError } from "@trpc/server";
import { createTRPCRouter, teamProcedure } from "../init";
import {
  getTransactionsEnriched,
  searchTransactions,
  getTransactionById,
  updateTransactionsBulk,
  getTransactionCategories,
} from "@cimantikos/database/queries";
import { transactions, transactionTags, transactionAttachments } from "@cimantikos/database/schema";
import { and, eq, inArray } from "drizzle-orm";

export const transactionsRouter = createTRPCRouter({
  // Enhanced list with filters
  list: teamProcedure
    .input(
      z.object({
        type: z.enum(["payment", "expense", "refund", "adjustment"]).optional(),
        status: z.array(z.string()).optional(),
        categories: z.array(z.string()).optional(),
        tags: z.array(z.string()).optional(),
        assignedId: z.string().uuid().optional(),
        search: z.string().optional(),
        startDate: z.string().datetime().optional(),
        endDate: z.string().datetime().optional(),
        hasAttachments: z.boolean().optional(),
        limit: z.number().min(1).max(100).default(50),
        cursor: z.object({ date: z.string().nullable(), id: z.string() }).nullish(),
      })
    )
    .query(async ({ ctx, input }) => {
      const items = await getTransactionsEnriched(ctx.db, {
        teamId: ctx.teamId,
        ...input,
        startDate: input.startDate ? new Date(input.startDate) : undefined,
        endDate: input.endDate ? new Date(input.endDate) : undefined,
        cursor: input.cursor
          ? {
              date: input.cursor.date ? new Date(input.cursor.date) : null,
              id: input.cursor.id,
            }
          : null,
      });

      const last = items.at(-1);
      const nextCursor = last
        ? {
            date: last.transaction.date ? new Date(last.transaction.date).toISOString() : null,
            id: last.transaction.id,
          }
        : null;

      return { items, nextCursor };
    }),

  // Full-text search
  search: teamProcedure
    .input(
      z.object({
        query: z.string().min(1),
        limit: z.number().min(1).max(50).default(20),
      })
    )
    .query(async ({ ctx, input }) => {
      return searchTransactions(ctx.db, {
        teamId: ctx.teamId,
        query: input.query,
        limit: input.limit,
      });
    }),

  // Get single transaction with full details
  getById: teamProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ ctx, input }) => {
      const result = await getTransactionById(ctx.db, {
        teamId: ctx.teamId,
        transactionId: input.id,
      });

      if (!result) {
        throw new TRPCError({ code: "NOT_FOUND", message: "Transaction not found" });
      }

      return result;
    }),

  // Bulk update
  updateMany: teamProcedure
    .input(
      z.object({
        ids: z.array(z.string().uuid()).min(1),
        categorySlug: z.string().optional(),
        status: z.string().optional(),
        assignedId: z.string().uuid().nullish(),
        recurring: z.boolean().optional(),
        frequency: z.string().nullish(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const { ids, ...updates } = input;

      return updateTransactionsBulk(ctx.db, {
        teamId: ctx.teamId,
        transactionIds: ids,
        updates,
      });
    }),

  // Bulk delete
  deleteMany: teamProcedure
    .input(z.array(z.string().uuid()).min(1))
    .mutation(async ({ ctx, input }) => {
      // Soft delete
      return ctx.db
        .update(transactions)
        .set({ deletedAt: new Date() })
        .where(and(eq(transactions.teamId, ctx.teamId), inArray(transactions.id, input)))
        .returning();
    }),

  // Add tag to transaction
  addTag: teamProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        tagId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction belongs to team
      const trx = await ctx.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.teamId, ctx.teamId)))
        .limit(1);

      if (!trx[0]) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db
        .insert(transactionTags)
        .values({
          teamId: ctx.teamId,
          transactionId: input.transactionId,
          tagId: input.tagId,
        })
        .onConflictDoNothing()
        .returning();
    }),

  // Remove tag from transaction
  removeTag: teamProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        tagId: z.string().uuid(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      return ctx.db
        .delete(transactionTags)
        .where(
          and(
            eq(transactionTags.teamId, ctx.teamId),
            eq(transactionTags.transactionId, input.transactionId),
            eq(transactionTags.tagId, input.tagId)
          )
        )
        .returning();
    }),

  // Upload attachment
  uploadAttachment: teamProcedure
    .input(
      z.object({
        transactionId: z.string().uuid(),
        name: z.string(),
        path: z.array(z.string()),
        type: z.string().optional(),
        mimeType: z.string().optional(),
        size: z.number().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      // Verify transaction
      const trx = await ctx.db
        .select({ id: transactions.id })
        .from(transactions)
        .where(and(eq(transactions.id, input.transactionId), eq(transactions.teamId, ctx.teamId)))
        .limit(1);

      if (!trx[0]) {
        throw new TRPCError({ code: "FORBIDDEN" });
      }

      return ctx.db
        .insert(transactionAttachments)
        .values({
          teamId: ctx.teamId,
          transactionId: input.transactionId,
          name: input.name,
          path: input.path,
          type: input.type,
          mimeType: input.mimeType,
          size: input.size ? BigInt(input.size) : null,
          uploadedBy: ctx.userId,
        })
        .returning();
    }),

  // Get categories
  categories: teamProcedure.query(async ({ ctx }) => {
    return getTransactionCategories(ctx.db, { teamId: ctx.teamId });
  }),

  // Stats (keep existing)
  stats: teamProcedure.query(async ({ ctx }) => {
    return getTransactionStats(ctx.db, ctx.teamId);
  }),

  // Create payment (keep existing)
  createPayment: teamProcedure
    .input(
      z.object({
        amount: z.number().positive(),
        currency: z.string().min(3).max(3).default("GHS"),
        name: z.string().min(1),
        description: z.string().optional(),
        clientId: z.string().uuid().optional(),
        orderId: z.string().uuid().optional(),
        invoiceId: z.string().uuid().optional(),
        paymentMethod: z.string().optional(),
        paymentReference: z.string().optional(),
        transactionDate: z.string().datetime().optional(),
      })
    )
    .mutation(async ({ ctx, input }) => {
      const trxNumber = `TX-${Date.now()}`;
      const now = new Date();

      const [created] = await ctx.db
        .insert(transactions)
        .values({
          teamId: ctx.teamId,
          transactionNumber: trxNumber,
          name: input.name,
          description: input.description,
          internalId: `manual_${now.getTime()}_${Math.random().toString(36).substr(2, 9)}`,
          type: "payment",
          status: "completed" as any,
          amount: input.amount as any,
          currency: input.currency,
          date: input.transactionDate ? new Date(input.transactionDate) : now,
          transactionDate: input.transactionDate ? new Date(input.transactionDate) : now,
          clientId: input.clientId ?? null,
          orderId: input.orderId ?? null,
          invoiceId: input.invoiceId ?? null,
          paymentMethod: (input.paymentMethod as any) ?? null,
          paymentReference: input.paymentReference ?? null,
          manual: true,
        })
        .returning();

      // Auto-allocate if invoice provided
      if (input.invoiceId && created) {
        await ctx.db.insert(transactionAllocations).values({
          transactionId: created.id,
          invoiceId: input.invoiceId,
          amount: input.amount as any,
        });
      }

      return created;
    }),
});
```

---

## 📅 Implementation Roadmap

### **Week 1-2: Schema Foundation**
- [ ] Create enums (migration 0006)
- [ ] Enhance transactions table (migration 0007)
- [ ] Add FTS (migration 0008)
- [ ] Add indexes (migration 0009)
- [ ] Test in staging
- [ ] Deploy to production

**Deliverables:**
- 4 migration files
- Updated schema.ts
- Performance benchmarks

### **Week 3-4: Related Tables**
- [ ] Create categories table (migration 0010)
- [ ] Seed system categories
- [ ] Create tags junction (migration 0011)
- [ ] Create attachments table (migration 0012)
- [ ] Update queries with joins
- [ ] Update tRPC routers

**Deliverables:**
- 3 migration files
- Enhanced query functions
- tRPC endpoints for tags/attachments

### **Week 5-6: UI Components**
- [ ] Bulk actions dropdown
- [ ] Advanced filter component
- [ ] Filter chips
- [ ] Export to CSV
- [ ] Tag management UI
- [ ] Attachment upload
- [ ] Category selector (hierarchical)
- [ ] Column visibility toggle

**Deliverables:**
- 8 new React components
- Updated transactions view
- Export functionality

### **Week 7-8: Polish & Optimization**
- [ ] Keyboard shortcuts (Arrow keys, ESC, CMD+S)
- [ ] Sticky columns
- [ ] Bottom bar with totals
- [ ] Empty states
- [ ] Loading skeletons
- [ ] Error boundaries
- [ ] Performance optimization

**Deliverables:**
- UX polish
- Keyboard nav
- Performance improvements

### **Week 9+ (Optional): AI Features**
- [ ] Vector embeddings setup (migration 0013)
- [ ] Auto-categorization job
- [ ] Recurring detection algorithm
- [ ] AI-powered search
- [ ] Enrichment UI

**Deliverables:**
- AI infrastructure
- Background jobs
- Smart features

---

## 🎯 Success Metrics

### Performance
- [ ] Initial page load: < 400ms (current: ~800ms)
- [ ] Filter application: < 200ms
- [ ] Search results: < 150ms
- [ ] Bulk action: < 500ms for 50 items

### Usability
- [ ] Reduce clicks to find transaction: 3 → 1 (search)
- [ ] Bulk categorization: 50 transactions in < 10 seconds
- [ ] Export 1000 transactions: < 2 seconds

### Coverage
- [ ] 90% of transactions auto-categorized (with AI)
- [ ] 80% have attachments (receipts)
- [ ] 100% tagged by type (income/expense)

---

## 🚨 Migration Risks & Mitigation

### Risk 1: Breaking Existing Queries
**Mitigation:**
- Keep old fields during transition
- Add new fields as nullable
- Backfill data before making NOT NULL
- Run queries in parallel (old + new) for 1 week

### Risk 2: Enum Migration Failures
**Mitigation:**
- Map all existing values to enum values first
- Use `USING` clause in ALTER
- Test on copy of production data
- Have rollback script ready

### Risk 3: Performance Degradation
**Mitigation:**
- Create indexes CONCURRENTLY
- Test with production-sized dataset
- Monitor query times before/after
- Use EXPLAIN ANALYZE

### Risk 4: Data Loss
**Mitigation:**
- Full database backup before migration
- Test migrations on staging first
- Use transactions where possible
- Verify row counts after migration

---

## 📚 Reference Links

### Midday Source Files
- Transactions schema: `midday-assistant-v2/packages/db/src/schema.ts` (line 182)
- Transactions table: `midday-assistant-v2/apps/dashboard/src/components/tables/transactions/data-table.tsx`
- Columns: `midday-assistant-v2/apps/dashboard/src/components/tables/transactions/columns.tsx`
- Filters: `midday-assistant-v2/apps/dashboard/src/components/transactions-search-filter.tsx`
- Bulk actions: `midday-assistant-v2/apps/dashboard/src/components/bulk-actions.tsx`

### Documentation
- Drizzle ORM: https://orm.drizzle.team/
- TanStack Table: https://tanstack.com/table/latest
- tRPC v11: https://trpc.io/docs
- PostgreSQL Full-Text Search: https://www.postgresql.org/docs/current/textsearch.html
- pgvector: https://github.com/pgvector/pgvector

---

## 🤝 Next Steps

1. **Review this document** with team
2. **Prioritize phases** (can skip AI if not needed)
3. **Set sprint goals** (2-week sprints)
4. **Start with migrations** (Week 1-2)
5. **Incremental deployment** (staging → production)

---

**Document maintained by:** Factory Droid  
**Created:** 2025-01-XX  
**Status:** Ready for Implementation  
**Estimated Effort:** 6-9 weeks (core features), 2-3 weeks (AI optional)
