## Objective
Migrate Cimantikós’ operations to a Supabase-centered stack while keeping the Telegram Mastra agent and adding a shadcn-powered admin frontend.

## Architecture Overview
- **Supabase**: single source of truth (Postgres + pgvector) for workflows, embeddings, clients, orders, invoices, measurements, files, and audit logs.
- **Mastra Telegram Agent**: retains existing flows but switches to Supabase-backed storage/services.
- **Admin Frontend**: Next.js 15 + shadcn UI, secured by Supabase Auth, for human oversight and data edits.

## Phase 1 – Supabase Foundations
1. Provision Supabase project, enable pgvector, create SQL migrations for:
   - `mastra_kv`, `mastra_vectors`, `workflow_runs`.
   - Business tables: `clients`, `orders`, `order_items`, `invoices`, `measurements`, `measurement_values`, optional `files`, `audit_log`.
   - Helper sequences for order & invoice numbers.
2. Configure RLS policies and roles (`service_role`, `admin`, `staff`).
3. Distribute env vars (`SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY`, `SUPABASE_ANON_KEY`) to bot/frontend environments.

## Phase 2 – Mastra & Telegram Agent Migration
1. Build Supabase adapters:
   - `SupabaseStore` implementing Mastra storage contract.
   - `SupabaseVectorStore` handling vector upsert/search.
2. Create TypeScript service modules interfacing Supabase (`clientService`, `orderService`, `invoiceService`, `measurementService`, `fileService`, `searchService`).
3. Refactor workflows/tools:
   - Replace Notion integrations with Supabase services.
   - Update `invoiceWorkflow` and `measurementWorkflow` to persist data in Supabase.
   - Adjust bot handlers to use Supabase IDs and maintain Cloudinary integration.
4. Extend health checks to verify Supabase availability.
5. Author migration scripts:
   - `migrate-libsql-to-supabase.ts` for Mastra state.
   - `migrate-notion-to-supabase.ts` pulling existing Notion data.

## Phase 3 – Admin Frontend (Next.js + shadcn)
1. Scaffold Next.js 15 project with App Router.
2. Install Tailwind + shadcn/ui; set up design tokens matching brand.
3. Integrate Supabase Auth (email OTP or Google SSO) with middleware to protect routes.
4. Build pages/components:
   - **Dashboard**: KPIs, workflow run feed, quick links.
   - **Clients**: table with search/filter, detail page, edit modal.
   - **Orders/Invoices**: combined view with status filters, detail drawer, PDF preview (Cloudinary), actions to mark paid/retry workflow.
   - **Measurements**: tabular view, measurement details, export to CSV.
   - **Files**: gallery/list for uploaded documents/photos.
   - **Workflow Runs / Logs**: timeline of agent activity.
5. Use shadcn components (DataTable, Dialog, Tabs, Cards) for consistent UI.
6. Set up API layer:
   - Server components fetch via Supabase service client.
   - Client mutations via Supabase JS + React Query; log actions to `audit_log`.
7. Optional extras: real-time updates with Supabase Realtime, charts (Recharts), manual Mastra workflow triggers via server actions.

## Phase 4 – Testing & Rollout
1. Automated checks:
   - `bun run type-check` after backend refactors.
   - Unit tests for Supabase services (mock client or dedicated test schema).
   - Playwright/Cypress covering auth and CRUD flows in the frontend.
2. Staging environment with Supabase staging DB; run migrations and import scripts in dry-run mode.
3. Production cutover:
   - Run migration scripts.
   - Update bot env to Supabase credentials; remove LibSQL dependencies.
   - Deploy Next.js admin app; verify end-to-end flows (Telegram invoice + frontend updates).
4. Decommission Notion after validation; archive exports for backup.

## Phase 5 – Operations
- Monitor Supabase metrics and logs; add alerts for failed policies/slow queries.
- Centralize Mastra workflow logs/audit trails in Supabase for easy frontend access.
- Document runbooks for migrations, onboarding new staff, key rotation, and recovery.

Let me know when you’d like to move into implementation.