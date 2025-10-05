# Architecture Refactor Plan: Moving to Server Components & Adopting Midday Patterns

## Current State Analysis

### ✅ Strengths
- **Multi-tenant from day 1**: Team-based architecture with proper RLS
- **Communication inbox**: Good start on unified WhatsApp/Instagram messaging
- **Core domain models**: Clients, Orders, Invoices, Measurements, Transactions well-defined
- **Modern stack**: Next.js 15, React 19, Supabase, tRPC foundation

### ⚠️ Issues & Confusion
- **Mixed patterns**: Client-side Supabase queries + incomplete tRPC setup
- **Telegram bot + Mastra**: Added complexity before core architecture settled
- **No clear data layer**: Direct Supabase calls scattered across components
- **Missing Server Components**: Not leveraging Next.js 15's app router properly
- **Package organization**: Domain/services packages barely used

---

## Key Learnings from Midday

### 1. **Package Architecture** 
```
packages/
├── supabase/          # Client factories, auth, types
│   ├── client/        # Browser & server clients
│   ├── queries/       # Reusable query functions
│   ├── mutations/     # Reusable mutation functions
│   └── types/         # Database types from Supabase CLI
├── db/                # Drizzle ORM schema + query builders  
│   ├── schema.ts      # Single source of truth
│   ├── client.ts      # Connection pool with replicas
│   └── queries/       # Complex business queries
└── ui/                # Shared components only
```

**Why**: Clear separation between Supabase (auth + simple queries) and Drizzle (complex business logic). The `@midday/db` package handles connection pooling, read replicas, and type-safe queries.

### 2. **Data Fetching Pattern**
```typescript
// ❌ AVOID: Client components with Supabase
// Your current pattern:
const { data } = useQuery({
  queryKey: ['clients'],
  queryFn: async () => {
    const { data } = await supabase.from('clients').select('*');
    return data;
  }
});

// ✅ ADOPT: Server Components + tRPC
// Server Component:
export default async function ClientsPage() {
  const clients = await getClients({ teamId }); // Direct DB query
  return <ClientList initialClients={clients} />;
}

// Client Component (for mutations/updates):
'use client';
export function ClientList({ initialClients }) {
  const utils = useTRPC();
  const { mutate } = useTRPC.clients.create.useMutation({
    onSuccess: () => utils.clients.list.invalidate()
  });
  // ...
}
```

**Why**: Server Components = faster loads, smaller bundles, better SEO. Client components only where interactivity needed.

### 3. **tRPC Router Organization**
```typescript
// Midday pattern - per-domain routers
routers/
├── _app.ts                 // Root router
├── clients.router.ts       // All client operations
├── orders.router.ts        // All order operations  
├── communications.router.ts
└── transactions.router.ts

// Example router structure:
export const clientsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ teamId: z.string().uuid() }))
    .query(({ input }) => getClients(input)),
    
  create: protectedProcedure
    .input(insertClientSchema)
    .mutation(({ input, ctx }) => createClient(input, ctx.teamId)),
    
  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(({ input }) => updateClient(input)),
});
```

**Why**: Domain-driven organization, type-safe end-to-end, easy to test.

### 4. **Server Actions for Mutations**
```typescript
// Midday uses both:
// 1. tRPC for queries (easy caching, devtools)
// 2. Server Actions for complex mutations (better error handling)

'use server';
export async function updateClientAction(data: UpdateClientInput) {
  const user = await getUser();
  const result = await updateClientSchema.safeParseAsync(data);
  
  if (!result.success) {
    return { error: result.error.flatten() };
  }
  
  await db.update(clients)
    .set(result.data)
    .where(eq(clients.id, result.data.id));
    
  revalidatePath('/clients');
  return { success: true };
}
```

**Why**: Server Actions handle form submissions elegantly, progressive enhancement, better TypeScript inference.

### 5. **Schema Organization**
Midday uses **Drizzle ORM** alongside Supabase:
- Supabase: Auth, RLS policies, real-time subscriptions
- Drizzle: Type-safe queries, migrations, complex joins

We should keep your Supabase migrations but add Drizzle for the application layer.

---

## Refactor Plan (Phased Approach)

### Phase 1: Remove Telegram Bot & Mastra ✂️
**Goal**: Simplify codebase to focus on web app architecture

**Actions**:
1. Delete `apps/telegram-bot/` entirely
2. Remove Mastra dependencies from root `package.json`
3. Remove `@mastra/*` packages from `apps/api/package.json`
4. Keep communication infrastructure (WhatsApp/Instagram via Evolution API)

**Rationale**: These can be added back later once architecture is solid. Communication domain stays but Telegram bot goes.

---

### Phase 2: Reorganize Packages 📦
**Goal**: Adopt Midday's clear package boundaries

**New Structure**:
```
packages/
├── supabase/                    # NEW
│   ├── src/
│   │   ├── client/
│   │   │   ├── server.ts       # Server-side client
│   │   │   ├── browser.ts      # Client-side client  
│   │   │   └── middleware.ts   # Auth middleware
│   │   ├── queries/            # Simple select queries
│   │   ├── mutations/          # Simple insert/update/delete
│   │   └── types.ts            # Generated from Supabase CLI
│   └── package.json
│
├── database/                    # RENAMED from 'database'
│   ├── src/
│   │   ├── schema.ts           # Drizzle schema (keep current structure)
│   │   ├── client.ts           # Connection pool + Drizzle setup
│   │   ├── queries/            # Complex business queries
│   │   │   ├── clients.ts
│   │   │   ├── orders.ts
│   │   │   ├── communications.ts
│   │   │   └── transactions.ts
│   │   └── utils/
│   └── package.json
│
├── ui/                          # KEEP
│   └── (Midday-based components)
│
└── services/                    # REFACTOR
    └── (Business logic only, NOT data fetching)
```

**Migration**:
1. Create `packages/supabase` following Midday's structure
2. Move your `lib/supabase-*.ts` files into this package
3. Consolidate all DB queries into `packages/database/src/queries/`

---

### Phase 3: Adopt Server Components 🚀
**Goal**: Leverage Next.js 15 properly

**App Router Structure**:
```
apps/admin/src/
├── app/
│   ├── layout.tsx              # Root layout (already good)
│   ├── (auth)/
│   │   ├── login/
│   │   │   └── page.tsx        # Server Component
│   │   └── teams/
│   │       └── page.tsx        # Server Component  
│   │
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Dashboard layout with Sidebar
│   │   ├── page.tsx            # Dashboard home - Server Component
│   │   ├── clients/
│   │   │   ├── page.tsx        # Server Component (data fetch)
│   │   │   └── _components/    # Client components
│   │   │       ├── client-list.tsx
│   │   │       ├── create-client-dialog.tsx
│   │   │       └── client-actions.tsx
│   │   ├── orders/
│   │   │   └── page.tsx        # Server Component
│   │   ├── inbox/              # Communication inbox
│   │   │   ├── page.tsx        # Server Component
│   │   │   └── _components/
│   │   │       ├── thread-list.tsx      # Client (real-time)
│   │   │       ├── message-view.tsx     # Client (real-time)
│   │   │       └── composer.tsx         # Client
│   │   └── transactions/
│   │       └── page.tsx
│   │
│   └── api/
│       └── trpc/[trpc]/
│           └── route.ts        # tRPC endpoint
│
├── actions/                     # NEW - Server Actions
│   ├── clients.ts
│   ├── orders.ts
│   ├── communications.ts
│   └── transactions.ts
│
├── lib/
│   └── trpc/                    # tRPC client setup
│
└── components/                  # Shared client components
```

**Key Changes**:
1. All route `page.tsx` files are Server Components by default
2. Fetch data directly in Server Components (no `useQuery` at page level)
3. Client components in `_components/` folders (marked with `'use client'`)
4. Use Server Actions for form submissions

---

### Phase 4: Build Out tRPC Layer 🔌
**Goal**: Type-safe API for client-side interactions

**Router Structure**:
```typescript
// apps/api/src/trpc/routers/_app.ts
export const appRouter = createTRPCRouter({
  health: healthRouter,
  clients: clientsRouter,
  orders: ordersRouter,
  invoices: invoicesRouter,
  measurements: measurementsRouter,
  transactions: transactionsRouter,
  communications: communicationsRouter,
});

export type AppRouter = typeof appRouter;
```

**Example Router**:
```typescript
// apps/api/src/trpc/routers/clients.ts
import { createTRPCRouter, protectedProcedure } from '../init';
import { getClients, getClient, createClient } from '@cimantikos/database/queries/clients';

export const clientsRouter = createTRPCRouter({
  list: protectedProcedure
    .input(z.object({ 
      teamId: z.string().uuid(),
      search: z.string().optional(),
    }))
    .query(async ({ input, ctx }) => {
      return getClients({
        teamId: ctx.teamId!,
        search: input.search,
      });
    }),

  byId: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .query(async ({ input, ctx }) => {
      return getClient(input.id, ctx.teamId!);
    }),

  create: protectedProcedure
    .input(insertClientSchema)
    .mutation(async ({ input, ctx }) => {
      return createClient(input, ctx.teamId!);
    }),

  update: protectedProcedure
    .input(updateClientSchema)
    .mutation(async ({ input, ctx }) => {
      return updateClient(input, ctx.teamId!);
    }),

  delete: protectedProcedure
    .input(z.object({ id: z.string().uuid() }))
    .mutation(async ({ input, ctx }) => {
      return deleteClient(input.id, ctx.teamId!);
    }),
});
```

**Client Usage**:
```typescript
// In a Client Component
'use client';
import { useTRPC } from '@/lib/trpc/client';

export function ClientList() {
  const { data: clients, isLoading } = useTRPC.clients.list.useQuery({
    teamId: currentTeamId,
  });

  const { mutate: createClient } = useTRPC.clients.create.useMutation({
    onSuccess: () => {
      utils.clients.list.invalidate();
    },
  });

  // ...
}
```

---

### Phase 5: Finalize Schema & Types 📊
**Goal**: Single source of truth for all data structures

**Schema Updates**:
1. **Keep your Supabase migrations** (already good with RLS)
2. **Add Drizzle schema** mirroring Supabase (for type safety)
3. **Generate TypeScript types**:
   ```bash
   # From Supabase
   supabase gen types typescript --local > packages/supabase/src/types.ts
   
   # From Drizzle
   bun run drizzle-kit introspect:pg
   ```

**Key Schema Decisions**:
1. Keep `team_id` on all domain tables ✅
2. Keep RLS policies in Supabase ✅  
3. Add indexes for common queries (already mostly done ✅)
4. Consider:
   - `communication_messages.is_status` → might not be needed
   - `whatsapp_contacts` + `instagram_contacts` → could unify into single `contacts` table with `provider` field
   - `orders.items` JSONB → consider normalizing to `order_items` table for better querying

---

### Phase 6: Communication Inbox Refinement 💬
**Goal**: Real-time messaging with proper architecture

**Patterns to Keep**:
- `communication_accounts` (multi-provider)
- `communication_threads` (conversations)
- `communication_messages` (messages)
- Evolution API integration for WhatsApp

**Improvements**:
1. Use Supabase Realtime for live updates:
   ```typescript
   // Server Component - initial data
   export default async function InboxPage() {
     const threads = await getThreads({ teamId });
     return <InboxView initialThreads={threads} />;
   }

   // Client Component - realtime updates
   'use client';
   export function InboxView({ initialThreads }) {
     const [threads, setThreads] = useState(initialThreads);
     
     useEffect(() => {
       const subscription = supabase
         .channel('threads')
         .on('postgres_changes', {
           event: '*',
           schema: 'public',
           table: 'communication_messages',
         }, (payload) => {
           // Update threads...
         })
         .subscribe();
       
       return () => subscription.unsubscribe();
     }, []);
     
     return <ThreadList threads={threads} />;
   }
   ```

2. Consider using tRPC subscriptions for messages (alternative to Supabase Realtime)

---

## Implementation Order

### Week 1: Foundation
1. ✂️ Remove Telegram bot & Mastra
2. 📦 Create `packages/supabase` with Midday structure
3. 📦 Reorganize `packages/database` with query builders
4. 🔧 Set up Drizzle alongside Supabase

### Week 2: Data Layer
1. 🔌 Build out all tRPC routers (clients, orders, invoices, etc.)
2. 🔌 Add proper auth context to tRPC
3. 📝 Implement database query functions in `packages/database/src/queries/`
4. ✅ Update existing API routes to use new structure

### Week 3: Frontend Migration
1. 🚀 Migrate one route to Server Components (e.g., `/clients`)
2. 🚀 Create pattern for Client Components with tRPC
3. 🚀 Migrate remaining routes (orders, inbox, transactions)
4. 💅 Ensure UI components are properly "use client" marked

### Week 4: Polish
1. ⚡ Add proper error boundaries
2. ⚡ Implement loading states (Suspense)
3. ⚡ Add Server Actions for forms
4. ⚡ Set up proper caching strategies
5. 📚 Document new patterns for the team

---

## Success Metrics

1. **Performance**: Initial page load < 1s (Server Components)
2. **Type Safety**: 100% type coverage from DB → API → Frontend
3. **Code Organization**: Clear boundaries between packages
4. **Developer Experience**: Fast hot reload, clear error messages
5. **Maintainability**: New features follow established patterns

---

## Risks & Mitigations

**Risk**: Breaking existing functionality during migration
**Mitigation**: Migrate incrementally, one route at a time. Keep old code until new code is verified.

**Risk**: Complexity of dual-layer (Supabase + Drizzle)
**Mitigation**: Clear rules: Supabase for auth/real-time/RLS, Drizzle for complex queries/types.

**Risk**: Learning curve for team
**Mitigation**: Create pattern examples, pair programming sessions, comprehensive docs.

---

## Next Steps

1. **Review this plan** with the team
2. **Create new branch**: `refactor/server-components-trpc`
3. **Start with Phase 1**: Remove Telegram/Mastra (quick win)
4. **Build packages/supabase**: Following Midday's structure
5. **Migrate one route end-to-end**: Prove the pattern works

Let me know if you'd like me to proceed with implementation or if you have questions about any part of this plan! 🚀