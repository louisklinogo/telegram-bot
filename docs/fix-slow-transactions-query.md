# Fix Slow Transactions Query - Missing Database Indexes

## Problem Diagnosis

**Symptoms:**
- Transactions page takes 5.52 seconds to load
- Other pages also slow (2-5 seconds)
- Network tab shows `transactionsList.batch` taking forever

**Root Cause:**
The `transactions` table is missing critical indexes, causing **FULL TABLE SCANS** on every query.

**Current Schema:**
```typescript
// Only ONE index exists:
statusIdx: index("idx_transactions_status").on(table.status)
```

**Query Pattern:**
```sql
SELECT transactions.*, clients.*
FROM transactions
LEFT JOIN clients ON transactions.client_id = clients.id
WHERE 
  transactions.team_id = ? 
  AND transactions.deleted_at IS NULL
ORDER BY 
  transactions.transaction_date DESC, 
  transactions.id DESC
LIMIT 50;
```

**Missing Indexes:**
- ❌ `team_id` (filtered every query - CRITICAL!)
- ❌ `deleted_at` (filtered every query)
- ❌ `transaction_date` (sorted every query)
- ❌ Composite index for optimal performance

---

## Solution: Add Database Indexes

### Step 1: Run This SQL in Supabase

Go to **Supabase Dashboard → SQL Editor** and run:

```sql
-- ============================================================================
-- CRITICAL INDEXES FOR TRANSACTIONS TABLE
-- ============================================================================

-- Individual indexes for common filters
CREATE INDEX IF NOT EXISTS idx_transactions_team_id 
ON transactions(team_id);

CREATE INDEX IF NOT EXISTS idx_transactions_deleted_at 
ON transactions(deleted_at);

CREATE INDEX IF NOT EXISTS idx_transactions_transaction_date 
ON transactions(transaction_date DESC);

-- Composite index for optimal query performance
-- This covers: team_id filter + deleted_at filter + transaction_date sort
CREATE INDEX IF NOT EXISTS idx_transactions_team_deleted_date 
ON transactions(team_id, deleted_at, transaction_date DESC);

-- Additional useful indexes
CREATE INDEX IF NOT EXISTS idx_transactions_client_id 
ON transactions(client_id);

CREATE INDEX IF NOT EXISTS idx_transactions_invoice_id 
ON transactions(invoice_id);

CREATE INDEX IF NOT EXISTS idx_transactions_order_id 
ON transactions(order_id);

-- ============================================================================
-- VERIFY OTHER TABLES HAVE TEAM_ID INDEXES
-- ============================================================================

-- Clients table (should already have this, but verify)
CREATE INDEX IF NOT EXISTS idx_clients_team_id 
ON clients(team_id) WHERE deleted_at IS NULL;

-- Orders table (should already have this, but verify)
CREATE INDEX IF NOT EXISTS idx_orders_team_id 
ON orders(team_id) WHERE deleted_at IS NULL;

-- Invoices table (should already have this, but verify)
CREATE INDEX IF NOT EXISTS idx_invoices_team_id 
ON invoices(team_id) WHERE deleted_at IS NULL;

-- Measurements table
CREATE INDEX IF NOT EXISTS idx_measurements_team_id 
ON measurements(team_id) WHERE deleted_at IS NULL;

-- ============================================================================
-- VERIFY INDEXES WERE CREATED
-- ============================================================================

-- Run this to see all indexes on transactions table:
SELECT 
  indexname, 
  indexdef
FROM pg_indexes 
WHERE tablename = 'transactions'
ORDER BY indexname;
```

---

### Step 2: Test the Query Performance

After creating indexes, test the query directly in Supabase SQL Editor:

```sql
-- Replace 'YOUR-TEAM-ID-HERE' with your actual team ID
EXPLAIN ANALYZE
SELECT 
  transactions.*,
  clients.*
FROM transactions
LEFT JOIN clients ON transactions.client_id = clients.id
WHERE 
  transactions.team_id = 'YOUR-TEAM-ID-HERE'
  AND transactions.deleted_at IS NULL
ORDER BY 
  transactions.transaction_date DESC, 
  transactions.id DESC
LIMIT 50;
```

**Expected Results:**
- **Before indexes:** Full table scan, 1000ms+
- **After indexes:** Index scan, <50ms (plus network latency)

---

### Step 3: Update Schema File

Update `packages/database/src/schema.ts` to match the database:

```typescript
export const transactions = pgTable(
  "transactions",
  {
    id: uuid("id").primaryKey().defaultRandom(),
    orderId: uuid("order_id").references(() => orders.id, { onDelete: "set null" }),
    invoiceId: uuid("invoice_id").references(() => invoices.id, { onDelete: "set null" }),
    clientId: uuid("client_id").references(() => clients.id, { onDelete: "set null" }),
    transactionNumber: varchar("transaction_number", { length: 50 }).notNull(),
    type: varchar("type", { length: 50 }).notNull(),
    category: varchar("category", { length: 100 }),
    amount: numeric("amount", { precision: 10, scale: 2 }).notNull(),
    currency: varchar("currency", { length: 3 }).default("GHS").notNull(),
    paymentMethod: varchar("payment_method", { length: 50 }),
    paymentReference: varchar("payment_reference", { length: 100 }),
    description: text("description").notNull(),
    notes: text("notes"),
    transactionDate: timestamp("transaction_date", { withTimezone: true }).defaultNow().notNull(),
    dueDate: timestamp("due_date", { withTimezone: true }),
    status: varchar("status", { length: 50 }).default("completed").notNull(),
    createdAt: timestamp("created_at", { withTimezone: true }).defaultNow().notNull(),
    updatedAt: timestamp("updated_at", { withTimezone: true }).defaultNow().notNull(),
    deletedAt: timestamp("deleted_at", { withTimezone: true }),
    teamId: uuid("team_id")
      .notNull()
      .references(() => teams.id, { onDelete: "cascade" }),
  },
  (table) => ({
    // Existing index
    statusIdx: index("idx_transactions_status").on(table.status),
    
    // NEW INDEXES (add these):
    teamIdIdx: index("idx_transactions_team_id").on(table.teamId),
    deletedAtIdx: index("idx_transactions_deleted_at").on(table.deletedAt),
    transactionDateIdx: index("idx_transactions_transaction_date").on(table.transactionDate),
    clientIdIdx: index("idx_transactions_client_id").on(table.clientId),
    invoiceIdIdx: index("idx_transactions_invoice_id").on(table.invoiceId),
    orderIdIdx: index("idx_transactions_order_id").on(table.orderId),
    
    // Composite index for optimal query performance
    teamDeletedDateIdx: index("idx_transactions_team_deleted_date")
      .on(table.teamId, table.deletedAt, table.transactionDate),
  }),
);
```

---

## Expected Performance Improvement

### Before Indexes:
- **Network latency:** 200-300ms (Ghana → Ireland)
- **Query execution:** 3000-5000ms (FULL TABLE SCAN)
- **Total:** 5.52 seconds 😱

### After Indexes:
- **Network latency:** 200-300ms (Ghana → Ireland - can't fix this)
- **Query execution:** 10-50ms (INDEX SCAN) ✅
- **Total:** 250-350ms 🎉

**Expected improvement: ~15-20x faster!**

---

## Why This Happened

Your schema definitions had indexes for most tables:
```typescript
// Orders table - HAS indexes
(table) => ({
  teamIdIdx: index("idx_orders_team_id").on(table.teamId),
  clientIdIdx: index("idx_orders_client_id").on(table.clientId),
  statusIdx: index("idx_orders_status").on(table.status),
  createdAtIdx: index("idx_orders_created_at").on(table.createdAt),
  deletedAtIdx: index("idx_orders_deleted_at").on(table.deletedAt),
})

// Transactions table - MISSING indexes!
(table) => ({
  statusIdx: index("idx_transactions_status").on(table.status),
  // ❌ Missing team_id index
  // ❌ Missing deleted_at index
  // ❌ Missing transaction_date index
})
```

The `transactions` table was added later and didn't get proper indexes.

---

## Other Performance Notes

### Geographic Latency (Can't Fix Without Migration)
- **Your location:** Ghana 🇬🇭
- **Supabase location:** Ireland 🇮🇪 (eu-west)
- **Distance:** ~5,000 km
- **Baseline latency:** 200-300ms per request

**Long-term solution:**
- Migrate Supabase to **South Africa** region (much closer to Ghana)
- Or deploy app to **Vercel Edge** with Ireland region

### Development vs Production
- **Dev mode (Next.js):** Adds 100-200ms overhead
- **Production build:** Much faster, optimized

**Test production build:**
```bash
bun run build
bun run start
```

### Turbopack
You mentioned you have Turbopack enabled ✅ - that's good for dev experience!

---

## Verification Checklist

After running the SQL commands:

- [ ] Indexes created (run verification query)
- [ ] Transactions page loads in <500ms (from Ghana)
- [ ] Network tab shows `transactionsList.batch` ~200-300ms
- [ ] Schema file updated to match database
- [ ] Committed changes to git

---

## Additional Optimization Ideas (Future)

1. **Connection pooling** - Already using Drizzle with Postgres.js ✅
2. **Query result caching** - Cache for 30s-1min on heavy pages
3. **Parallel queries** - Already doing this with `Promise.all()` ✅
4. **Reduce query complexity** - Only select needed fields
5. **Regional migration** - Move DB closer to users (biggest impact!)

---

## Summary

**Problem:** Missing database indexes causing full table scans  
**Solution:** Add 7 critical indexes to transactions table  
**Expected result:** 5.52s → 250-350ms (20x faster!)  
**Remaining bottleneck:** Geographic latency (200-300ms Ghana → Ireland)

The indexes fix the query performance. The geographic latency is a separate issue that requires either moving the database or deploying to edge functions.
