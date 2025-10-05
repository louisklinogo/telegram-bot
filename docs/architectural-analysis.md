# Architectural Analysis: Midday vs Telegram-Bot

**Date:** 2025-02-10  
**Purpose:** Compare Midday's production architecture with our current implementation and provide recommendations

---

## Executive Summary

After deep analysis of both codebases, your current architecture is **mostly aligned with Midday's patterns** for Server Components + tRPC. However, there are key organizational and pattern improvements to adopt. The concern about `apps/telegram-bot` being premature is **valid** - your core should be consolidated before adding specialized apps.

---

## 1. Repository Structure Comparison

### Midday's Structure
```
apps/
├── api          # Hono backend (REST + tRPC)
├── dashboard    # Next.js 15 (main frontend)
├── desktop      # Electron app
├── docs         # Documentation site
├── engine       # Background jobs/processing
└── website      # Marketing site

packages/
├── db           # Drizzle ORM + queries (their "database" equivalent)
├── supabase     # Auth + simple CRUD
├── ui           # Shared components
├── invoice      # Domain-specific logic
├── inbox        # Email integration
├── events       # Event bus
├── jobs         # Background job definitions
├── logger       # Logging
├── encryption   # Security utilities
└── 13+ more...  # Highly modular!
```

### Our Current Structure
```
apps/
├── admin        # Next.js 15 frontend ✅
├── api          # Hono backend + tRPC ✅
├── worker       # WhatsApp message handling ✅
└── telegram-bot # ⚠️ Potentially premature

packages/
├── database     # Drizzle ORM + queries ✅
├── supabase     # Auth ✅
├── ui           # Shared components ✅
├── config       # Shared config
├── domain       # Domain models
└── services     # Business logic
```

**Key Differences:**
1. **Midday has 18+ packages** - extreme modularity
2. **We have fewer specialized apps** - more consolidated (good for early stage)
3. **Midday separates concerns heavily** - packages for events, jobs, encryption, etc.
4. **Our domain/services structure** - not in Midday (they inline more in packages/db/queries)

---

## 2. Server Components Pattern Analysis

### Midday's Implementation ✅

**Server Component (Page):**
```typescript
// apps/dashboard/src/app/[locale]/(app)/(sidebar)/customers/page.tsx
export default async function Page(props: Props) {
  const queryClient = getQueryClient();
  const searchParams = await props.searchParams;

  // Prefetch data on server
  await queryClient.fetchInfiniteQuery(
    trpc.customers.get.infiniteQueryOptions({...filter, sort})
  );

  // Batch prefetch analytics
  batchPrefetch([
    trpc.invoice.mostActiveClient.queryOptions(),
    trpc.invoice.inactiveClientsCount.queryOptions(),
  ]);

  return (
    <HydrateClient> {/* Hydration boundary */}
      <Suspense fallback={<CustomersSkeleton />}>
        <DataTable /> {/* Client component */}
      </Suspense>
    </HydrateClient>
  );
}
```

**Client Component (DataTable):**
```typescript
"use client";

export function DataTable() {
  const trpc = useTRPC();
  
  // Uses prefetched data, then enables client-side features
  const { data, fetchNextPage } = useSuspenseInfiniteQuery(
    trpc.customers.get.infiniteQueryOptions({...})
  );
  
  // Full interactivity: filtering, sorting, infinite scroll
}
```

**Key Patterns:**
- ✅ Server prefetches ALL initial data
- ✅ `<HydrateClient>` boundary for dehydrated state
- ✅ Client components use `useSuspenseInfiniteQuery` for instant load
- ✅ Suspense boundaries with skeletons
- ✅ No "initialData" prop passing - uses dehydrated QueryClient

### Our Current Implementation ⚠️

**Server Component (Page):**
```typescript
// apps/admin/src/app/(dashboard)/clients/page.tsx
export default function ClientsPage() {
  return (
    <Suspense fallback={<ClientsLoading />}>
      <ClientsData /> {/* Another Server Component */}
    </Suspense>
  );
}

async function ClientsData() {
  const teamId = await getCurrentTeamId();
  const clients = await getClients(db, { teamId, limit: 100 });
  
  return <ClientsList initialClients={clients} teamId={teamId} />; // ❌ Prop drilling
}
```

**Client Component:**
```typescript
"use client";

export function ClientsList({ initialClients, teamId }: Props) {
  // Uses initialData (not as clean as Midday's dehydration)
  const { data: clients = initialClients } = trpc.clients.list.useQuery(
    { search: search || undefined },
    { initialData: initialClients, enabled: !!teamId }
  );
}
```

**Gaps vs Midday:**
- ❌ No `HydrateClient` - we pass `initialData` via props (less clean)
- ❌ Not using `useSuspenseQuery` - manual loading states
- ❌ Not prefetching with tRPC query options - direct DB calls
- ⚠️ Extra nesting (ClientsData component) - could be flatter

---

## 3. tRPC Setup Comparison

### Midday's Server tRPC (`apps/dashboard/src/trpc/server.tsx`)
```typescript
import "server-only";

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
        transformer: superjson,
        async headers() {
          const supabase = await createClient();
          const { data: { session } } = await supabase.auth.getSession();
          
          return {
            Authorization: `Bearer ${session?.access_token}`,
            "x-user-timezone": await getTimezone(),
            "x-user-locale": await getLocale(),
            "x-user-country": await getCountryCode(),
          };
        },
      }),
      loggerLink({ enabled: (opts) => process.env.NODE_ENV === "development" }),
    ],
  }),
});

export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return (
    <HydrationBoundary state={dehydrate(queryClient)}>
      {props.children}
    </HydrationBoundary>
  );
}

// Helper to batch prefetch multiple queries
export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(
  queryOptionsArray: T[],
) {
  const queryClient = getQueryClient();
  for (const queryOptions of queryOptionsArray) {
    if (queryOptions.queryKey[1]?.type === "infinite") {
      void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
      void queryClient.prefetchQuery(queryOptions);
    }
  }
}
```

### Our Server tRPC (`apps/admin/src/lib/trpc/server.ts`)
```typescript
import 'server-only';

export async function getServerSession() {
  const supabase = createServerClient();
  const { data: { session } } = await supabase.auth.getSession();
  return session;
}

export async function getCurrentTeamId() {
  const session = await getServerSession();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  return user?.currentTeamId || null;
}

export { db };
```

**Major Gaps:**
- ❌ We don't have a server-side tRPC client setup!
- ❌ No `getQueryClient()` or `HydrateClient` wrapper
- ❌ We bypass tRPC entirely on server - use direct DB calls
- ❌ No prefetching via tRPC query options

**Why Midday's approach is better:**
1. **Unified data layer** - Server and client both use tRPC
2. **Type safety end-to-end** - Server prefetch matches client query
3. **Cache hydration** - Server prefetches → client instantly loads
4. **Less boilerplate** - No prop drilling of initialData

---

## 4. Database Schema Analysis

### Schema Quality: ✅ EXCELLENT

**Your schema is well-designed:**
- ✅ Multi-tenancy with `team_id` on all tables
- ✅ Soft deletes (`deleted_at`) on key tables
- ✅ Proper indexes on foreign keys and search fields
- ✅ JSONB for flexible data (order items, measurements)
- ✅ Enums via check constraints (status fields)
- ✅ Comments on complex columns

**Comparison with Midday:**
- Midday uses **pgEnum** extensively (more type-safe than check constraints)
- Midday has **custom types** (e.g., `numericCasted` for precision)
- Midday's schema is **massive** (40+ tables) - yours is focused (15 tables)

**Recommendations:**
1. **Consider pgEnum** for status fields (instead of varchar + check):
   ```typescript
   export const orderStatusEnum = pgEnum("order_status", [
     "generated", "in_progress", "completed", "cancelled"
   ]);
   
   // Then in table:
   status: orderStatusEnum('status').default('generated').notNull(),
   ```

2. **Add RLS policies** - Midday has RLS on most tables (you have it on some):
   ```sql
   ALTER TABLE clients ENABLE ROW LEVEL SECURITY;
   CREATE POLICY "Team isolation" ON clients
     FOR ALL USING (team_id IN (
       SELECT team_id FROM users_on_team WHERE user_id = auth.uid()
     ));
   ```

3. **Consider splitting `orders.items` JSON** - Midday has `invoice_line_items` table:
   - Pros: Better queries, constraints, indexing
   - Cons: More complexity
   - Decision: Fine to keep JSON for now, refactor if you need to query items

---

## 5. Query Organization

### Midday's Approach
```
packages/db/src/queries/
├── customers.ts          # All customer queries
├── customer-analytics.ts # Customer analytics
├── invoices.ts           # Invoice queries
├── transactions.ts       # Transaction queries
├── bank-accounts.ts      # Bank account queries
└── ...20+ more files
```

Each file exports focused query functions:
```typescript
// packages/db/src/queries/customers.ts
export async function getCustomers(db, { teamId, search, limit }) {
  return db.select().from(customers)
    .where(and(
      eq(customers.teamId, teamId),
      search ? ilike(customers.name, `%${search}%`) : undefined
    ))
    .limit(limit);
}
```

### Our Approach
```
packages/database/src/queries/
├── index.ts           # Re-exports
├── clients.ts         # ✅ Good
├── orders.ts          # ✅ Good
└── communications.ts  # ✅ Good
```

**Assessment: ✅ Following Midday's pattern!**

---

## 6. Apps Structure: Is `apps/telegram-bot` Premature?

### Current Apps Analysis

**apps/admin** - ✅ KEEP
- Main user interface
- Well-integrated with tRPC
- Server Components working

**apps/api** - ✅ KEEP
- Central tRPC router
- REST webhooks
- Auth middleware

**apps/worker** - ✅ KEEP
- WhatsApp message handling (Baileys)
- Background processing
- Isolated from main app

**apps/telegram-bot** - ⚠️ **REVIEW NEEDED**
- **Question:** What does it do that worker doesn't?
- **Concern:** Adds complexity before core is solid
- **Alternative:** Could be `packages/telegram` if just integration code

### Recommendation: **Consolidate or Delay**

**Option A: Merge into worker**
```
apps/worker/
├── whatsapp/    # Baileys integration
├── telegram/    # Telegram Bot API integration
└── instagram/   # Future Instagram integration
```

**Option B: Make it a package**
```
packages/telegram/
├── client.ts    # Telegram client setup
├── handlers.ts  # Message handlers
└── types.ts     # Telegram-specific types
```

Then `apps/worker` imports and uses it.

**Rationale:**
- Midday has specialized apps (desktop, engine) because they're **separate deployments**
- If telegram-bot is just another message handler, it belongs in worker
- Only make a separate app if it needs **independent deployment**

---

## 7. Key Missing Pieces

### From Midday That We Should Adopt:

1. **Server-side tRPC Client** ⭐ HIGH PRIORITY
   - Add `packages/supabase/src/server.ts` with tRPC client
   - Use `HydrateClient` for cache hydration
   - Prefetch data with tRPC query options

2. **Suspense Query Pattern** ⭐ HIGH PRIORITY
   - Switch from `useQuery` to `useSuspenseQuery`
   - Remove loading states from components
   - Let Suspense boundaries handle loading

3. **pgEnum for Status Fields** 🔧 MEDIUM PRIORITY
   - Migrate check constraints to pg enums
   - Better type safety and autocomplete

4. **Batch Prefetch Helper** 🔧 MEDIUM PRIORITY
   - Add `batchPrefetch()` utility
   - Prefetch analytics in parallel

5. **Infinite Query Pattern** 🔧 LOW PRIORITY
   - For long lists (clients, orders, messages)
   - Better UX than pagination

6. **Custom Numeric Type** 🔧 LOW PRIORITY  
   - Midday's `numericCasted` auto-converts string → number
   - Reduces boilerplate

### What We Have That Midday Doesn't:

1. **packages/domain** - Domain models (good for DDD)
2. **packages/services** - Business logic layer (good separation)
3. **packages/config** - Shared config (cleaner than inline)

**Keep these!** They're valid architectural choices.

---

## 8. Migration Action Plan

### Phase 1: Server-Side tRPC Setup (CRITICAL)

**Goal:** Match Midday's Server Component + tRPC pattern

**Tasks:**
1. Create `apps/admin/src/lib/trpc/query-client.ts`:
   ```typescript
   import { QueryClient } from '@tanstack/react-query';
   
   export function makeQueryClient() {
     return new QueryClient({
       defaultOptions: {
         queries: {
           staleTime: 60 * 1000, // 1 minute
         },
       },
     });
   }
   ```

2. Update `apps/admin/src/lib/trpc/server.ts`:
   ```typescript
   import "server-only";
   import { cache } from "react";
   import { createTRPCClient, httpBatchLink } from "@trpc/client";
   import { createTRPCOptionsProxy } from "@trpc/tanstack-react-query";
   import { HydrationBoundary, dehydrate } from "@tanstack/react-query";
   import { makeQueryClient } from "./query-client";
   import type { AppRouter } from "api/src/trpc/routers/_app";
   
   export const getQueryClient = cache(makeQueryClient);
   
   export const trpc = createTRPCOptionsProxy<AppRouter>({
     queryClient: getQueryClient,
     client: createTRPCClient({
       links: [
         httpBatchLink({
           url: `${process.env.NEXT_PUBLIC_API_URL}/trpc`,
           async headers() {
             // Existing auth logic
           },
         }),
       ],
     }),
   });
   
   export function HydrateClient(props: { children: React.ReactNode }) {
     const queryClient = getQueryClient();
     return (
       <HydrationBoundary state={dehydrate(queryClient)}>
         {props.children}
       </HydrationBoundary>
     );
   }
   ```

3. Refactor `apps/admin/src/app/(dashboard)/clients/page.tsx`:
   ```typescript
   import { HydrateClient, trpc, getQueryClient } from '@/lib/trpc/server';
   import { Suspense } from 'react';
   
   export default async function ClientsPage() {
     const queryClient = getQueryClient();
     
     // Prefetch on server using tRPC
     await queryClient.fetchQuery(
       trpc.clients.list.queryOptions({})
     );
     
     return (
       <HydrateClient>
         <div className="flex flex-col gap-4 p-6">
           <ClientsHeader />
           <Suspense fallback={<ClientsSkeleton />}>
             <ClientsList /> {/* No props needed! */}
           </Suspense>
         </div>
       </HydrateClient>
     );
   }
   ```

4. Update `apps/admin/src/app/(dashboard)/clients/_components/clients-list.tsx`:
   ```typescript
   "use client";
   
   import { trpc } from '@/lib/trpc/client';
   import { useSuspenseQuery } from '@tanstack/react-query';
   
   export function ClientsList() {
     const [search, setSearch] = useState('');
     
     // No initialData - uses hydrated cache!
     const { data: clients } = trpc.clients.list.useSuspenseQuery(
       { search: search || undefined }
     );
     
     // ...rest of component
   }
   ```

**Impact:**
- ✅ No more prop drilling
- ✅ Type-safe prefetching
- ✅ Instant client-side loads
- ✅ Unified data layer

---

### Phase 2: Adopt Suspense Queries (MEDIUM)

**Goal:** Remove loading states from components

**Migration:**
```diff
// Before
- const { data, isLoading } = trpc.clients.list.useQuery({});
- if (isLoading) return <Spinner />;

// After
+ const { data } = trpc.clients.list.useSuspenseQuery({});
```

Let Suspense boundaries handle loading:
```tsx
<Suspense fallback={<Skeleton />}>
  <Component /> {/* useSuspenseQuery inside */}
</Suspense>
```

**Benefit:** Cleaner components, better UX (streaming SSR).

---

### Phase 3: Schema Enhancements (LOW PRIORITY)

1. **Add pgEnum for status fields**
2. **Enable RLS on all team-scoped tables**
3. **Consider splitting order_items into table** (if needed)

---

### Phase 4: Consolidate Apps (MEDIUM)

**Evaluate `apps/telegram-bot`:**
- If it's just integration code → move to `packages/telegram`
- If it's a separate deployment → keep as app
- If it duplicates worker functionality → merge into worker

---

## 9. Final Recommendations

### DO NOW (Critical):
1. ✅ **Implement server-side tRPC client** (Phase 1 above)
2. ✅ **Add HydrateClient wrapper** for cache hydration
3. ✅ **Refactor one page** (e.g., clients) to validate pattern

### DO SOON (High Value):
4. 🔧 **Migrate to useSuspenseQuery** across admin app
5. 🔧 **Add batchPrefetch helper** for analytics pages
6. 🔧 **Review apps/telegram-bot** - consolidate or clarify

### DO LATER (Nice to Have):
7. 📋 **Add pgEnum** for status fields
8. 📋 **Enable RLS policies** on all tables
9. 📋 **Infinite scroll** for long lists

### DON'T DO:
- ❌ Don't over-modularize (Midday has 18 packages after years)
- ❌ Don't split domain/services (your pattern is valid)
- ❌ Don't add more apps until core is solid

---

## 10. Conclusion

**Your architecture is 80% aligned with Midday's proven patterns.** The gaps are:
1. **Server-side tRPC setup** (biggest gap, easiest to fix)
2. **Suspense query adoption** (incremental improvement)
3. **App structure clarity** (telegram-bot decision needed)

**Your schema is excellent** - well-designed multi-tenancy, good indexing, appropriate use of JSONB.

**Next Steps:**
1. Implement Phase 1 (server tRPC) for clients page
2. Test and validate the pattern
3. Roll out to other pages incrementally
4. Make telegram-bot decision (consolidate or justify)

You're on the right track! 🚀
