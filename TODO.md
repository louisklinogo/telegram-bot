# Transactions TODO

- [x] DB: Add FTS/trigram for transactions (stored fts_vector + GIN, trigram on name/description); idempotent migration.
- [x] DB: Expose enriched queries (joins: category/tags/attachments, pagination cursor, FTS search, bulk update/delete) in database package and tRPC.
- [x] RLS: Verify/add policies for transaction_tags, transaction_attachments (team_id scoped); optional embeddings tables later.
- [x] Admin UI: Row selection + BulkActions (category/status/assign, bulk delete for manual only) and Export bar.
- [x] Admin UI: Advanced filter (dates, status, categories, tags, accounts, attachments, amount range) with chips; wire to tRPC.
 - [x] Admin UI: Empty states – NoTransactions (CTA: connect account), NoResults (Clear filters) ; check middays, with loading overlay.
- [x] Admin UI: Sticky columns + horizontal scroll; arrow-key row navigation; infinite scroll (getNextPageParam).
- [x] Admin UI: AddTransactions menu (connect/import/create) and TransactionCreateSheet (description, amount+currency, account, date, category select, assign, attachments, exclude-from-analytics, note) with submit.
- [x] Admin UI: Category select with inline create; hierarchical list; color badges; persist and refetch on create.
- [x] Admin UI: Transactions actions (view details, mark completed/uncompleted, exclude/include, delete manual) via dropdown in Actions column.
- [x] Admin UI: Bottom bulk selection bar with Midday-style "Bulk edit" label, Actions dropdown, delete confirmation dialog.
- [x] Admin UI: Column visibility toggle with Filters/Export/Add buttons in toolbar.
- [x] Admin UI: TanStack Table integration - full table refactor with column definitions, row selection state, and proper TypeScript types.
- [x] Fix infinite render loop - migrated to Zustand store for row selection state following Midday's patterns.
- [ ] Admin UI: Implement Midday's TransactionsSearchFilter component - advanced filters with AI search, date picker, status/attachments/recurring filters, category/account/assignee/tags dropdowns, amount range.
- [x] Parity review: Study midday transactions/categories UI and finalize implementation plan from analysis below.

## Categories Parity (Midday)

- [x] DB: Add tax fields to `transaction_categories` (idempotent migration): `tax_rate numeric(10,2)`, `tax_type text`, `tax_reporting_code text`, `excluded boolean default false`; keep unique `(team_id, slug)` and existing indexes. Backfill NULLs safely.
- [x] Schema: Update Drizzle `transactionCategories` to include new columns; regenerate Supabase types; verify relations still use `(team_id, slug)` for FKs from `transactions`.
- [x] Queries: Update `getTransactionCategories` to sort system-first then name, and to return parents with attached children; ensure strict `team_id` scoping and stable ordering.
- [x] API: Add `transaction-categories` tRPC router with: `get`, `getById`, `create`, `update`, `delete`. Zod schemas include `taxRate`, `taxType`, `taxReportingCode`, `excluded`, `parentId`, `description`, `color`. Forbid delete when `system = true`.
- [x] Validation: Prevent circular parent references and block changing `parentId` if the category has children; enforce per-team slug uniqueness; decide slug policy on rename (prefer keeping slug stable).
- [x] Activity: Create activity events for category create/update/delete with relevant metadata.
- [ ] Embeddings: Generate/refresh category embeddings on create/rename using `transaction_category_embeddings`; batch-generate for existing categories.
- [x] Admin UI: Categories table → Midday-style expand/collapse tree with chevrons; show color dot, "System" chip, columns: Tax Type, Tax Rate, Report Code, Actions (Edit/Remove). Tooltips for descriptions.
- [x] Admin UI: Create/Edit Category sheet with: name, color, description, parent, `taxType`, `taxRate`, `taxReportingCode`, `excluded`; disable parent change when has children; prevent circular selection; hide Remove for system categories.
- [x] Admin UI: Transactions Filters → replaced free-text category input with multi-select from categories (show color + name); persists selection and invalidates list on change.
- [x] Admin UI: Transactions View → integrated BulkActions, AddTransactions, SimpleColumnVisibility components; updated toolbar and bulk selection bar to match Midday pattern exactly.
- [ ] Migrations/Seeds: Ensure `uncategorized` exists per team; backfill existing system categories with tax fields; (optional) seed richer defaults by country.
- [ ] CI: Run `bun run typecheck` and `bun run lint` after changes; regenerate Supabase types; verify no schema/type drift; confirm RLS/`team_id` scoping on all new queries.
- [ ] Cleanup: Remove deprecated `create-category-dialog.tsx` and references.

