# Cimantikós - Unified Communications & Business Management Platform

Multi-tenant SaaS for managing clients, orders, invoices, transactions and unified communications (WhatsApp, Instagram, SMS) with AI assistance.

## Engineering Constitution (Summary + Adherence)

- Server‑first; initialData on all pages; no client prefetch for initial loads.
- Drizzle is schema source of truth; regen Supabase types after schema changes.
- Strong typing only: no `any`; Hono context typed; single `Database` type used everywhere.
- Auth middleware sets { userId, teamId, supabaseAdmin }; every DB query must filter by `team_id`.
- REST/tRPC: minimal columns, no N+1; `.returns<T>()` only at chain end.
- Validation with Zod; consistent `{ error: string }` responses; fail fast.
- Performance: indexes on hot paths; avoid `select *`.
- Security: RLS on; server‑only secrets; signed short‑lived storage URLs.
- CI gates: typecheck, lint, build; schema/type drift check; block unscoped queries.
- Prohibited: client prefetch for initial loads, unscoped queries, ad‑hoc schema edits, `any`.

Adherence (PR Checklist):
- [ ] All queries filtered by `team_id`; auth middleware used.
- [ ] No `any`; Hono context vars accessed with types.
- [ ] Supabase types regenerated or confirmed unchanged.
- [ ] Minimal selects; `.returns<T>()` only at end.
- [ ] Zod validation present; consistent error shape.
- [ ] CI passes typecheck/lint/build; no schema/type drift.
 - [ ] UI/UX mirrors Midday components and patterns by default; no placeholder UIs without explicit approval; deviations documented with rationale.

Full document: `docs/engineering-constitution.md`

## Communication Style

- Use simple, plain words and short sentences.
- Keep replies concise (1–4 sentences); use bullet points when helpful.
- Avoid jargon and acronyms; if used, define briefly.
- Ask clarifying questions when a request is ambiguous; don’t assume.
- If asked “how should we do X”, first explain the approach in 1–3 bullets, then ask to proceed; if the command is clear, proceed without asking.
- Confirm before actions with side effects (migrations, data changes, pushes).
- No emojis. Only necessary code comments. Don’t suggest extras unless asked.
- When code is changed, end with a short, plain summary of what changed.
 - In planning, explicitly list any new UI actions/links/buttons; do not add UI elements not listed in the plan unless approved.

## Human-Readable Control Flow
When refactoring complex control flow, mirror natural human reasoning patterns:

1. **Ask the human question first**: "Can I use what I already have?" → early return for happy path
2. **Assess the situation**: "What's my current state and what do I need to do?" → clear, mutually exclusive conditions  
3. **Take action**: "Get what I need" → consolidated logic at the end
4. **Use natural language variables**: `canReuseCurrentSession`, `isSameSettings`, `hasNoSession`: names that read like thoughts
5. **Avoid artificial constructs**: No nested conditions that don't match how humans actually think through problems

Transform this: nested conditionals with duplicated logic
Into this: linear flow that mirrors human decision-making

## Honesty
Be brutally honest, don't be a yes man. 
If I am wrong, point it out bluntly. 
I need honest feedback on my code.


## Core Commands

**Development:**
- Start all services: `bun run dev` (API + Admin in parallel)
- API only: `bun run dev:api` (Hono on :3001)
- Admin only: `bun run dev:admin` (Next.js on :3000)
- Worker (WhatsApp): `bun run dev:worker`

**Quality Checks:**
- Type-check all: `bun run typecheck`
- Type-check API: `bun run typecheck:api`
- Type-check Admin: `bun run typecheck:admin`
- Lint all: `bun run lint`
- Format all: `bun run format`

**Database:**
- Generate migrations: `bun run db:generate`
- Push schema: `bun run db:push`
- Studio (GUI): `bun run db:studio`
- Generate Supabase types (used by app): `bun run db:types` → uses local CLI from devDependencies, writes to `packages/supabase/src/types/database.generated.ts`
- Alternative: `bun run db:types:generated` (same as above)

Automation:
- Pre-commit hook (Husky): regenerates types and fails the commit on drift
- CI workflow (Supabase Types Drift Check): regenerates types and fails PRs on drift (requires `SUPABASE_ACCESS_TOKEN` secret)

## Project Architecture

**Recent Major Refactor (Phase 1 & 2 Complete):**
We migrated from client-side only architecture to **Next.js 15 Server Components + tRPC**, following Midday's proven patterns. All new code MUST follow this architecture.

### Workspace Structure

```
apps/
├── admin/          # Next.js 15 frontend (Server Components + Client Components)
├── api/            # Hono backend with tRPC
└── worker/         # WhatsApp message handling (Baileys)

packages/
├── supabase/       # Auth, simple queries, RLS, real-time subscriptions
├── database/       # Drizzle ORM, complex queries, joins, connection pooling
└── ui/             # Shared React components (shadcn/ui based)
```

### Data Flow Pattern (CRITICAL)

```
[Server Component] → Direct DB query → Pass initialData → [Client Component]
     ↓                                                            ↓
getClients(db)                                          trpc.clients.list.useQuery()
                                                        (uses initialData, enables search)
```

**When to use what:**
- **Server Component**: Initial page data fetch, direct DB access, no hooks
- **Client Component**: Interactivity, forms, mutations, hooks, state
- **tRPC Query**: Client-side data fetching, cache management, real-time updates
- **tRPC Mutation**: Create/Update/Delete operations with optimistic updates
- **Supabase Client**: Auth, simple CRUD with RLS, real-time subscriptions
- **Drizzle**: Complex queries, joins, transactions, bulk operations

### Package Responsibilities

**`packages/supabase/`**
- Browser & server Supabase clients
- Auth flows (magic link, session management)
- Simple queries (single table SELECTs)
- Mutations (INSERT, UPDATE, DELETE)
- Real-time subscriptions
- RLS enforcement

**`packages/database/`**
- Drizzle schema (single source of truth)
- Connection pooling
- Complex queries (joins, aggregations)
- Query builders for reuse
- Type-safe database operations

**`apps/api/`**
- tRPC routers (clients, orders, communications, etc.)
- Auth middleware (Bearer token → team context)
- REST endpoints for webhooks (WhatsApp, Instagram)
- Business logic layer

**`apps/admin/`**
- Next.js 15 App Router
- Server Components for data fetching
- Client Components for UI/UX
- tRPC hooks for mutations
- Supabase auth integration

## Reference Codebases (IMPORTANT)

We have two reference implementations in the repo for learning:

**`midday-assistant-v2/`** - Production SaaS (our north star)
- Study for: Server Components patterns, tRPC setup, package structure
- Check when: Implementing new features, organizing code, handling auth

**`evolution-api/`** - WhatsApp API server
- Study for: WhatsApp integration patterns, webhook handling, media processing
- Check when: Working on messaging features, understanding Baileys

**Grep these codebases when stuck!** Don't reinvent the wheel.

## UI/UX Parity with Midday (REQUIRED)

- Mirror **EXACTLY** Midday’s UI/UX and component patterns by default (tables, filters, pagination, sheets/dialogs, empty states, spacing/typography).
- DO NOT IMPROVISE!!!!
- Prefer reusing existing components and patterns observed in `midday-assistant-v2`; only deviate with explicit approval and documented rationale.
- Do not ship placeholder UIs; if scope is unclear, propose the design and wait for confirmation.
- Before implementation, perform a “UI parity check with Midday” and reference the closest pages/components you are mirroring.
- Plans must enumerate any new UI actions/links/buttons. Avoid adding actions not in the plan without approval.

## Development Patterns

### ⚡ Performance-Optimized Pattern (REQUIRED)

**ALL pages MUST use the initialData pattern for optimal performance.**

This pattern was implemented across 7 pages in Phase A+B optimization (60-70% faster loads):
- Dashboard, Clients, Orders, Invoices, Measurements, Transactions, Inbox
- Layout auth checks (React.cache for deduplication)
- TeamDropdown (server-side data flow)

### Server Component (Data Fetching)

```typescript
// apps/admin/src/app/(dashboard)/feature/page.tsx
import { db, getCurrentTeamId } from '@/lib/trpc/server';
import { getFeatures } from '@cimantikos/database/queries';

export default async function FeaturePage() {
  const teamId = await getCurrentTeamId();
  
  // ✅ CORRECT: Direct DB query in Server Component
  const data = await getFeatures(db, { teamId, limit: 50 });
  
  // ✅ CORRECT: Pass data to Client Component
  return <FeatureList initialData={data} />;
}
```

**Rules:**
- MUST be async function
- Direct DB access via `@cimantikos/database/queries`
- NO hooks, NO 'use client' directive
- Pass data as props to Client Components
- ❌ NEVER use prefetch() or HydrateClient (deprecated - causes double-fetching)

### Client Component (Interactivity)

```typescript
// apps/admin/src/app/(dashboard)/feature/_components/feature-list.tsx
'use client';

import { trpc } from '@/lib/trpc';

type FeatureListProps = {
  initialData?: any[]; // Or specific type
};

export function FeatureList({ initialData = [] }: FeatureListProps) {
  // ✅ CORRECT: Use initialData from server (no refetch on mount!)
  const { data } = useSuspenseQuery({
    ...t.feature.list.queryOptions({}),
    initialData: initialData,
  });
  
  return <div>{/* render data */}</div>;
}
```

**For infinite queries:**
```typescript
const { data: pages } = useSuspenseInfiniteQuery({
  ...t.feature.list.infiniteQueryOptions({ limit: 50 }),
  initialData: initialData.length > 0
    ? {
        pages: [{ items: initialData, nextCursor: null }],
        pageParams: [null],
      }
    : undefined,
});
```

**Rules:**
- MUST have 'use client' directive at top
- Use tRPC hooks for queries/mutations
- Accept initialData from Server Component
- Use initialData in query options (prevents refetch!)
- Handle loading/error states

### tRPC Mutation Pattern

```typescript
'use client';

const utils = trpc.useUtils();

const { mutate, isPending } = trpc.feature.create.useMutation({
  onSuccess: () => {
    toast.success('Created!');
    utils.feature.list.invalidate(); // ← CRITICAL: Invalidate cache
  },
  onError: (error) => toast.error(error.message),
});
```

**Rules:**
- ALWAYS invalidate relevant queries in onSuccess
- Show loading state with isPending
- Handle errors gracefully
- Use optimistic updates for better UX

### Adding a New Feature (Step-by-Step)

1. **Database query** (`packages/database/src/queries/feature.ts`)
2. **tRPC router** (`apps/api/src/trpc/routers/feature.ts`)
3. **Add to app router** (`apps/api/src/trpc/routers/_app.ts`)
4. **Server Component page** (`apps/admin/src/app/(dashboard)/feature/page.tsx`)
5. **Client Components** (`apps/admin/src/app/(dashboard)/feature/_components/`)


## Coding Style & Conventions

**TypeScript:**
- Strict mode enabled
- No `any` types (use `unknown` if needed)
- Prefer `type` over `interface` for domain models
- Always Use Zod for runtime validation

**File Naming:**
- Use **kebab-case** for all files and folders (`client-card.tsx`, not `ClientCard.tsx`)
- Server Components: `page.tsx`, `layout.tsx` (no 'use client')
- Client Components: Inside `_components/` folder with 'use client'
- tRPC routers: Singular noun (`clients.ts`, not `client.ts`)
- Query functions: Plural noun (`getClients`, not `getClient`)

**Import Order:**
1. React/Next.js
2. Third-party libraries
3. Workspace packages (`@cimantikos/*`)
4. Local components
5. Types
6. Utilities

**Component Organization:**
```
feature/
├── page.tsx              # Server Component (root)
├── layout.tsx            # Server Component (optional)
└── _components/          # Client Components
    ├── feature-list.tsx
    ├── feature-card.tsx
    └── create-feature-dialog.tsx
```

## Multi-Tenancy (CRITICAL)

**Every query MUST be scoped by team_id:**

```typescript
// ✅ CORRECT
await db.select()
  .from(clients)
  .where(and(
    eq(clients.teamId, ctx.teamId),
    isNull(clients.deletedAt)
  ));

// ❌ WRONG - Missing team_id filter
await db.select().from(clients);
```

**Auth Context:**
- API validates Bearer token → user → team
- `ctx.teamId` available in all `teamProcedure` calls
- RLS policies enforce team isolation at DB level
- NEVER trust client-provided team_id

## Security & Auth

**Authentication Flow:**
1. User logs in via Supabase Magic Link
2. Session stored in cookie (handled by Supabase)
3. Admin app sends Bearer token to API
4. API validates token, extracts user, loads team
5. All queries scoped by team_id

**Environment Variables (NEVER commit):**
- `SUPABASE_SERVICE_ROLE_KEY` - Server-side only, grants RLS bypass
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` - Client-side, subject to RLS
- `DATABASE_URL` - Direct Postgres connection
- API keys should be in `.env.local` (gitignored)

**RLS Policies:**
- Enabled on ALL tables except `users`, `teams`
- Policies check `team_id = (SELECT current_team_id FROM users WHERE id = auth.uid())`
- Test with non-service-role key to verify

## Git Workflow

**Branching:**
- `master` - Production
- `feature/*` or `refactor/*` for work
- Branch from latest `master`

**Commits:**
- Conventional commits: `feat:`, `fix:`, `refactor:`, `docs:`
- Keep commits atomic and focused
- Run `bun run typecheck` before committing
- Include `Co-authored-by: factory-droid[bot]` when using agents

**Pull Requests:**
- Must pass typecheck + lint
- Include testing instructions
- Link to related issues
- Request review before merge

## Testing Strategy

**Current State:**
- No tests yet (planned)
- Manual testing via dev servers

**When Adding Tests (Future):**
- Unit tests: Query functions, utilities
- Integration tests: tRPC routers, API endpoints
- E2E tests: Critical user flows
- Use Vitest for speed

## External Services

**Supabase:**
- Auth, Database, Storage, Real-time
- Project: `zvatkstmsyuytbajzuvn`
- Dashboard: https://supabase.com/dashboard/project/zvatkstmsyuytbajzuvn

**WhatsApp (Baileys):**
- Session files in `apps/worker/.sessions/` (NEVER commit)
- Media stored in Supabase Storage
- Webhooks handled in `apps/api/src/rest/webhooks/`

**Instagram (Planned):**
- Integration TBD

## Known Gotchas

**1. Import Errors from Workspace Packages**
Run `bun install` to link workspace packages after adding new packages.

**2. Type Errors in tRPC**
Ensure `apps/api/package.json` exports the AppRouter:
```json
"exports": {
  "./trpc/routers/_app": "./src/trpc/routers/_app.ts"
}
```

**3. Server Component Hooks Error**
Add `'use client'` directive. Server Components cannot use hooks.

**4. RLS Blocking Queries**
Check if using service role key vs anon key. Service role bypasses RLS.

**5. Session Files in Git**
Added to `.gitignore`: `apps/worker/.sessions/` contains WhatsApp encryption keys.

**6. Midday/Evolution Repos in Git**
These are reference repos, excluded in `.gitignore` as embedded git repos.

## Domain Vocabulary

**Client** - Customer/business contact in the system  
**Order** - Transaction/sale record  
**Invoice** - Billing document  
**Communication** - Message thread (WhatsApp, Instagram, SMS)  
**Thread** - Conversation with a client  
**Team** - Tenant in multi-tenant system  
**Member** - User within a team  

## Documentation

**Read these for context:**
- `docs/architecture-migration-complete.md` - Full architecture overview
- `docs/quickstart-new-architecture.md` - Fast start guide
- `docs/refactor-phase1-summary.md` - Backend refactor details
- `docs/refactor-phase2-summary.md` - Frontend integration details

**TODOs**
- `docs/TODOs` - contains TODOs of stuff we gotta work on

## Performance Targets

**Achieved after Phase A+B optimization:**
- Initial page load: **200-400ms** ✅ (was 800-1100ms, 60-70% faster)
- Navigation: **150-250ms** ✅ (was 600-800ms, 70-80% faster)
- API response time: < 100ms (cached queries)
- Real-time message delivery: < 500ms
- tRPC query cache hit rate: > 80%
- Network requests: **50% reduction** per page ✅

**Key Optimizations:**
- ✅ All 7 pages use initialData pattern (zero prefetch waste)
- ✅ Auth checks use React.cache() (deduplicated)
- ✅ TeamDropdown uses server-side data (zero client queries)
- ✅ Consistent Server → Client data flow

## Debugging Tips

**Type errors in Server Components:**
```bash
bun run typecheck:admin
```

**tRPC errors:**
Check API logs and tRPC context setup. Verify Bearer token is sent.

**Database connection issues:**
Verify `DATABASE_URL` in `.env.local`. Check Supabase dashboard.

**WhatsApp not connecting:**
Delete session files and reconnect. Check `apps/worker` logs.

**Reference implementations:**
```bash
# Search Midday for patterns
grep -r "Server Component" midday-assistant-v2/
use nia mcp tools to search indexed midday repo

# Check Evolution API for WhatsApp
grep -r "sendMessage" evolution-api/
```

## Quick Wins

When agent needs to understand:
- **Server Components**: Check `apps/admin/src/app/(dashboard)/clients/page.tsx`
- **Client Components**: Check `apps/admin/src/app/(dashboard)/clients/_components/`
- **tRPC Router**: Check `apps/api/src/trpc/routers/clients.ts`
- **Database Queries**: Check `packages/database/src/queries/clients.ts`
- **Auth Flow**: Check `apps/api/src/trpc/init.ts`

## Success Criteria

**Every PR should:**
- ✅ Pass `bun run typecheck`
- ✅ Pass `bun run lint`
- ✅ Follow Server/Client Component patterns
- ✅ Include team_id filtering
- ✅ Use tRPC for API calls
- ✅ Update relevant documentation
- ✅ Test manually (no automated tests yet)

---

**Ship fast, learn from production code (Midday/Evolution), and follow established patterns.**
