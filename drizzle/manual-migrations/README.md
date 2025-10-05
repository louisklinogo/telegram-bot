# Transaction System Migrations

Manual SQL migrations for enhancing the transactions system following Midday patterns.

## 📋 Migration Order

Run these migrations **in order**:

### **Required Migrations (Core Functionality)**

1. ✅ **001_create_transaction_enums.sql**
   - Creates ENUMs for type-safe fields
   - **Run first** (before any table alterations)
   - **Safe** - No data changes

2. ✅ **002_enhance_transactions_table.sql**
   - Adds new fields to transactions table
   - Populates data from existing fields
   - **Contains data migration** - Review before running
   - **Time:** ~10-30 seconds depending on data size

3. ✅ **003_add_transaction_indexes.sql**
   - Creates performance indexes
   - **Safe** - Run any time after step 2
   - **Time:** ~5-15 seconds

4. ✅ **004_create_transaction_categories.sql**
   - Creates categories table
   - Seeds system categories for all teams
   - Migrates existing category strings to slugs
   - **Contains data migration** - Review seeded categories
   - **Time:** ~10-20 seconds

5. ✅ **005_create_transaction_tags.sql**
   - Creates tags and junction tables
   - Seeds common tags for all teams
   - **Safe** - Review seed data
   - **Time:** ~5-10 seconds

6. ✅ **006_create_transaction_attachments.sql**
   - Creates attachments table
   - **Safe** - No data changes
   - **Time:** ~5 seconds

### **Optional Migrations (Advanced Features)**

7. ⚠️ **007_optional_enum_conversion.sql**
   - Converts payment_method and status to ENUMs
   - **RISKY** - Only run if you want strict type enforcement
   - **Read warnings inside file first**
   - May fail if you have custom values

8. ✅ **008_optional_full_text_search.sql**
   - Enables full-text and fuzzy search
   - **Safe** - Adds search capabilities
   - **Time:** ~10-15 seconds

---

## 🚀 Quick Start

### Step 1: Verify Current State
```sql
-- Check current transactions table structure
SELECT column_name, data_type, is_nullable 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
ORDER BY ordinal_position;
```

### Step 2: Run Required Migrations (1-6)
Copy and paste each migration file into your Supabase SQL editor **in order**.

### Step 3: Verify Results
```sql
-- Check new columns exist
SELECT column_name, data_type 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN ('date', 'name', 'internal_id', 'category_slug', 'assigned_id');

-- Check new tables exist
SELECT table_name 
FROM information_schema.tables 
WHERE table_schema = 'public' 
AND table_name LIKE 'transaction_%';

-- Count seeded categories
SELECT team_id, COUNT(*) as category_count
FROM transaction_categories
WHERE system = true
GROUP BY team_id;
```

---

## ⚠️ Important Notes

### Before Running Migrations

1. **Backup your database** (Supabase does automatic backups, but verify)
2. **Test in a staging environment** if possible
3. **Review seed data** in migrations 004-005 (categories and tags)
4. **Check for custom values** before running migration 007

### Data Migration Points

**Migration 002** - Populates new fields:
- `date` from `transaction_date`
- `name` from first 100 chars of `description`
- `internal_id` as `'manual_' || id`
- `manual` set to `true` for all existing transactions

**Migration 004** - Seeds 20+ categories per team:
- Review the category list before running
- Customize colors if needed
- Attempts to map existing `category` strings to slugs

**Migration 005** - Seeds 10 common tags per team:
- Review the tag list
- Remove/add tags as needed for your business

### Performance Impact

- **During migration:** Minimal downtime, most operations are fast
- **After migration:** Query performance will **improve** significantly due to new indexes
- **Index creation:** May take longer on large datasets (10-30 seconds for 100k+ rows)

### Rollback Strategy

If something goes wrong:

```sql
-- Rollback new tables (run in reverse order)
DROP TABLE IF EXISTS transaction_attachments CASCADE;
DROP TABLE IF EXISTS transaction_tags CASCADE;
DROP TABLE IF EXISTS transaction_categories CASCADE;
DROP TABLE IF EXISTS tags CASCADE;

-- Rollback new columns from transactions
ALTER TABLE transactions
  DROP COLUMN IF EXISTS date,
  DROP COLUMN IF EXISTS name,
  DROP COLUMN IF EXISTS internal_id,
  DROP COLUMN IF EXISTS category_slug,
  DROP COLUMN IF EXISTS assigned_id,
  -- ... (drop other new columns)
  ;

-- Rollback enums
DROP TYPE IF EXISTS transaction_method CASCADE;
DROP TYPE IF EXISTS transaction_status CASCADE;
DROP TYPE IF EXISTS transaction_frequency CASCADE;
```

---

## 🔍 Verification Queries

### Check Migrations Ran Successfully

```sql
-- 1. Verify enums exist
SELECT typname 
FROM pg_type 
WHERE typname LIKE 'transaction_%';

-- 2. Count new columns
SELECT COUNT(*) 
FROM information_schema.columns 
WHERE table_name = 'transactions' 
AND column_name IN (
  'date', 'name', 'internal_id', 'category_slug', 
  'assigned_id', 'counterparty_name', 'merchant_name',
  'manual', 'recurring', 'frequency', 'enrichment_completed'
);
-- Should return: 11

-- 3. Count indexes
SELECT COUNT(*) 
FROM pg_indexes 
WHERE tablename = 'transactions' 
AND indexname LIKE 'idx_transactions_%';
-- Should be 10+

-- 4. Verify new tables
SELECT 
  table_name,
  (SELECT COUNT(*) FROM information_schema.columns c WHERE c.table_name = t.table_name) as column_count
FROM information_schema.tables t
WHERE table_schema = 'public' 
AND table_name IN (
  'transaction_categories',
  'transaction_tags',
  'transaction_attachments',
  'tags'
)
ORDER BY table_name;

-- 5. Check seeded data
SELECT 
  'Categories' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT team_id) as teams_count
FROM transaction_categories
WHERE system = true
UNION ALL
SELECT 
  'Tags' as type,
  COUNT(*) as total_count,
  COUNT(DISTINCT team_id) as teams_count
FROM tags;
```

### Check Data Migration

```sql
-- Check date population
SELECT 
  COUNT(*) as total,
  COUNT(date) as with_date,
  COUNT(name) as with_name,
  COUNT(internal_id) as with_internal_id
FROM transactions;
-- All counts should match

-- Check category migration
SELECT 
  COUNT(*) as total_with_category,
  COUNT(category_slug) as migrated_to_slug,
  ROUND(100.0 * COUNT(category_slug) / COUNT(*), 2) as migration_percent
FROM transactions
WHERE category IS NOT NULL;
```

---

## 📞 Support

If migrations fail:

1. **Check error message** - Most errors are self-explanatory
2. **Verify prerequisites** - Did you run migrations in order?
3. **Check constraints** - Do you have data that violates new constraints?
4. **Review seed data** - Customize categories/tags if needed

Common issues:

- **"enum does not exist"** - Run migration 001 first
- **"violates foreign key constraint"** - Run migrations in order
- **"duplicate key value"** - You may have existing data that conflicts

---

## 🎯 After Migrations

Once migrations are complete:

1. ✅ **Update Drizzle schema** - Already done in `packages/database/src/schema.ts`
2. ✅ **Update queries** - Already created `transactions-enhanced.ts`
3. 🔄 **Update tRPC router** - Next step
4. 🔄 **Build UI components** - Bulk actions, filters, etc.

Refer to `TRANSACTIONS-TODO.md` for the complete implementation roadmap.

---

**Created:** 2025-01-XX  
**Estimated Total Time:** 1-2 minutes for all required migrations  
**Risk Level:** Low (with proper testing)
