# System Overhaul: Cimantikós Architecture Redesign Blueprint

**Date:** 2025-10-03
**Author:** Kilo Code

## Executive Summary

This blueprint outlines a comprehensive architectural redesign for Cimantikós, aiming to align the system with production-grade patterns from Midday while adapting to our unique domain of tailoring business and unified communications. The current system, while partially migrated to Server Components + tRPC, exhibits critical gaps in API robustness, database security (RLS), and frontend consistency. The proposed redesign focuses on enhancing these areas, consolidating the `telegram-bot` application, and establishing a clear migration roadmap to achieve a scalable, secure, and maintainable multi-tenant SaaS platform.

## Current State

-   **Architecture:** Partially migrated to Next.js 15 Server Components + tRPC. Multi-tenant SaaS with `apps/admin` (Next.js frontend), `apps/api` (Hono backend), `apps/worker` (WhatsApp message handling), and `apps/telegram-bot` (Telegram bot). Core packages include `database`, `supabase`, `ui`, `config`, `domain`, and `services`.
-   **Database:** Supabase Postgres database with Drizzle ORM. Schema includes `clients`, `orders`, `invoices`, `measurements`, `transactions`, `communication_messages`, `communication_threads`, `teams`, `users`, etc. Multi-tenancy is implemented with `team_id` on most tables, but RLS is not universally applied, notably on the `teams` table itself. Some status fields use `varchar` with `CHECK` constraints instead of `pgEnum`. The `orders.items` is stored as JSONB.
-   **Tech Stack:** Next.js 15 (Admin), Hono (API), tRPC, Drizzle ORM, Supabase, Baileys (WhatsApp).
-   **Key Files:**
    *   `apps/admin/src/lib/trpc/server.ts`: Server-side tRPC setup, `HydrateClient`, `prefetch`.
    *   `apps/admin/src/lib/trpc/client.tsx`: Client-side tRPC setup, `TRPCProvider`.
    *   `apps/admin/src/app/(dashboard)/clients/page.tsx`: Example Server Component using `prefetch`.
    *   `apps/admin/src/app/(dashboard)/clients/_components/clients-list.tsx`: Example Client Component using `useSuspenseQuery`.
    *   `apps/api/src/index.ts`: Main API entry point, Hono setup, tRPC server mounting.
    *   `apps/api/src/trpc/init.ts`: tRPC context creation, `protectedProcedure`, `teamProcedure`.
    *   `packages/database/src/schema.ts`: Drizzle schema definitions.

## Proposed Architecture

### Design

The target architecture will fully embrace Midday's proven patterns for Server Components, tRPC, and multi-tenancy, while adapting them for Cimantikós's specific domain.

```mermaid
graph TD
    User(User) -->|Browser| AdminApp(apps/admin: Next.js 15)
    AdminApp -->|tRPC Calls (Prefetch/Query)| ApiApp(apps/api: Hono + tRPC)
    AdminApp -->|Supabase Client (Auth/RLS)| SupabaseDB(Supabase Database)
    ApiApp -->|Drizzle ORM| SupabaseDB
    ApiApp -->|Webhooks| WorkerApp(apps/worker: WhatsApp/Telegram)
    WorkerApp -->|Baileys/Telegram API| ExternalComms(External Communication Platforms)
    WorkerApp -->|Drizzle ORM| SupabaseDB

    subgraph Frontend
        AdminApp
    end

    subgraph Backend
        ApiApp
        WorkerApp
    end

    subgraph Data Layer
        SupabaseDB
    end

    subgraph External Services
        ExternalComms
    end

    style AdminApp fill:#f9f,stroke:#333,stroke-width:2px
    style ApiApp fill:#bbf,stroke:#333,stroke-width:2px
    style WorkerApp fill:#bfb,stroke:#333,stroke-width:2px
    style SupabaseDB fill:#ffb,stroke:#333,stroke-width:2px
    style ExternalComms fill:#eee,stroke:#333,stroke-width:2px
```

### Database Changes

-   **New Schema:**
    *   **`order_line_items` table:** Normalize `orders.items` JSONB into a dedicated table with `order_id`, `item_name`, `quantity`, `unit_price`, `total`, etc. This improves query flexibility, indexing, and data integrity.
-   **Column Type Migrations:**
    *   Convert `varchar` status fields (e.g., `garment_type` in `measurements`) to `pgEnum` types for enhanced type safety and database-level validation.
-   **RLS Policies:**
    *   Implement comprehensive RLS policies on the `teams` table and all other team-scoped tables (e.g., `clients`, `orders`, `invoices`, `measurements`, `communication_messages`, `communication_threads`, `users_on_team`). This is critical for robust multi-tenancy.
-   **Performance Optimizations:**
    *   Add missing indexes on foreign keys and frequently queried columns (e.g., `created_at`, `updated_at`, `status` fields).
    *   Consider implementing `pg_trgm` extension and corresponding GIN indexes for fuzzy search on text fields like client names, product descriptions, etc.

### API Changes

-   **Authentication Middleware:**
    *   Enhance `apps/api/src/trpc/init.ts` and related middleware to incorporate Midday's robust authentication patterns, including explicit handling of OAuth tokens and API keys, caching for performance, and fine-grained scope management.
    *   Implement `withRequiredScope` middleware for specific endpoints.
-   **CORS Configuration:**
    *   Refine `apps/api/src/index.ts` to use a more restrictive and production-ready CORS configuration, specifying allowed origins, methods, and headers explicitly.
-   **Geo Context:**
    *   Integrate `geo` context into `createTRPCContext` in `apps/api/src/trpc/init.ts` for potential future location-aware features.
-   **Error Handling & Logging:**
    *   Review and enhance error handling within `createTRPCContext` and middleware to provide clearer error messages and better logging for debugging.

### Repository Restructure

-   **`apps` Organization:**
    *   `apps/admin`: Remains the primary Next.js frontend.
    *   `apps/api`: Remains the Hono backend with tRPC.
    *   `apps/worker`: Consolidates all communication message handling.
    *   **`apps/telegram-bot`:** This application will be consolidated. The preferred approach is to merge its functionality into `apps/worker` (e.g., `apps/worker/src/telegram/`) or extract reusable Telegram client/handler logic into a new `packages/telegram` and have `apps/worker` consume it. This reduces the number of independent deployments and centralizes communication logic.
-   **Package Split/Merge Decisions:**
    *   **Keep:** `packages/database`, `packages/supabase`, `packages/ui`, `packages/config`.
    *   **Refine/Expand:** `packages/domain` and `packages/services` should evolve towards more granular, domain-specific packages as the project grows (e.g., `packages/invoicing`, `packages/messaging`, `packages/analytics`, `packages/auth`, `packages/logger`, `packages/events`). This mirrors Midday's modularity for better maintainability and scalability.
-   **New Packages Needed:**
    *   `packages/telegram` (if Telegram bot logic is extracted).
    *   `packages/auth` (for shared, complex authentication logic).
    *   `packages/logger` (for centralized logging).
    *   `packages/events` (for an event bus/pub-sub system).

### Trade-offs

-   **Increased Initial Complexity:** Adopting Midday's patterns, especially for API authentication and package modularity, will require a higher initial investment in development time and learning curve.
-   **Migration Effort:** Significant refactoring will be needed across the frontend, API, and database.
-   **Performance vs. Modularity:** While increased modularity generally improves maintainability, it can sometimes introduce minor overheads in build times or runtime if not managed carefully.

## Implementation Plan

### Phase 0: Foundation (Critical Infrastructure)
-   **Tasks:**
    1.  Implement comprehensive RLS policies on the `teams` table and all other team-scoped tables.
    2.  Refactor API CORS configuration in `apps/api/src/index.ts` to be more restrictive.
    3.  Integrate `geo` context into `apps/api/src/trpc/init.ts`.
    4.  Convert `varchar` status fields (e.g., `garment_type`) to `pgEnum` types in `packages/database/src/schema.ts` and apply migrations.
    5.  Consolidate `apps/telegram-bot` functionality into `apps/worker` or create `packages/telegram`.
-   **Success criteria:** All team-scoped data is protected by RLS; API has production-grade CORS; `geo` context is available in tRPC; `pgEnum` types are used for all status fields; `telegram-bot` is integrated or refactored.
-   **Dependencies:** Database access, API access.
-   **Estimated complexity:** High

### Phase 1: Frontend Hydration & Prefetching (Admin App)
-   **Tasks:**
    1.  Consistently apply `HydrateClient` for cache hydration across `apps/admin`.
    2.  Implement `prefetch` for server-side data fetching in all Server Components.
    3.  Adopt `useSuspenseQuery` in all relevant Client Components, removing manual loading states.
-   **Success criteria:** All major `admin` pages use the new hydration/prefetching pattern; no visible loading spinners for initial data; improved page load performance.
-   **Dependencies:** Phase 0 completed.
-   **Estimated complexity:** Medium

### Phase 2: API Authentication & Authorization Enhancements
-   **Tasks:**
    1.  Implement Midday's robust authentication middleware (OAuth/API key handling, caching, scope management) in `apps/api/src/trpc/init.ts` and related files.
    2.  Introduce `packages/auth` for shared authentication logic if needed.
    3.  Implement user-based rate limiting in the API.
-   **Success criteria:** API authentication is secure and performant; fine-grained access control is enforced; rate limits are active.
-   **Dependencies:** Phase 0 completed.
-   **Estimated complexity:** High

### Phase 3: Database Schema Refinement & Optimization
-   **Tasks:**
    1.  Normalize `orders.items` JSONB column into a new `order_line_items` table and migrate existing data.
    2.  Add comprehensive indexes on foreign keys and frequently queried columns.
    3.  Implement `pg_trgm` and GIN indexes for fuzzy search.
-   **Success criteria:** Normalized order item data; improved query performance; effective fuzzy search capabilities.
-   **Dependencies:** Phase 0 completed.
-   **Estimated complexity:** Medium

### Phase 4: Package Modularity & Domain-Specific Refinement
-   **Tasks:**
    1.  Refine `packages/domain` and `packages/services` into more granular, domain-specific packages (e.g., `packages/invoicing`, `packages/messaging`, `packages/analytics`).
    2.  Introduce `packages/logger` and `packages/events` for centralized logging and event bus implementation.
-   **Success criteria:** Clearer separation of concerns in packages; improved code organization; enhanced observability.
-   **Dependencies:** Phases 0-3 completed.
-   **Estimated complexity:** Medium

## Risks & Mitigations

-   **RLS Misconfiguration (Phase 0):**
    *   **Risk:** Unauthorized data access or accidental data exposure.
    *   **Mitigation:** Thorough unit and integration tests for all RLS policies; peer review of all SQL policy definitions; staged rollout with strict monitoring.
-   **Breaking Changes during API Refactoring (Phase 2):**
    *   **Risk:** Disrupting existing frontend or external integrations.
    *   **Mitigation:** Maintain clear API versioning; provide comprehensive documentation for new authentication flows; implement robust API contract testing.
-   **Data Migration Complexity (Phase 3):**
    *   **Risk:** Data loss or corruption during schema changes.
    *   **Mitigation:** Develop idempotent migration scripts; perform extensive testing on staging environments with realistic data; implement rollback strategies.
-   **Performance Regressions (Phases 1 & 3):**
    *   **Risk:** Slower page loads or API response times.
    *   **Mitigation:** Establish baseline performance metrics before changes; implement continuous performance monitoring; conduct load testing and A/B testing.
-   **Over-engineering/Analysis Paralysis (All Phases):**
    *   **Risk:** Getting bogged down in excessive modularity or perfect solutions.
    *   **Mitigation:** Adhere to the "follow Midday when" and "adapt Midday when" framework; prioritize pragmatic solutions over theoretical perfection; maintain a clear focus on business value.

## Testing Strategy

-   **Unit Tests:** For individual functions, utilities, and small components (e.g., database queries, API middleware, UI components).
-   **Integration Tests:** For tRPC routers, API endpoints, and data flow between Server and Client Components.
-   **End-to-End (E2E) Tests:** For critical user flows in the `admin` app (e.g., client creation, order processing, message sending).
-   **Security Testing:** Automated security scans, manual penetration testing, and RLS policy validation.
-   **Performance Testing:** Load testing for API, Lighthouse/Web Vitals for frontend.
-   **Manual Verification:** Comprehensive manual testing by QA and stakeholders after each phase.

## Success Metrics

-   **Improved Page Load Performance:** Average Lighthouse scores for key `admin` pages increase by 15% (e.g., FCP, LCP).
-   **Enhanced API Security:** Zero critical/high-severity vulnerabilities identified in security audits related to authentication and authorization.
-   **Consistent Frontend Experience:** All `admin` pages consistently use the new hydration/prefetching pattern, resulting in a smoother user experience.
-   **Clearer Codebase:** Reduced cognitive load for developers due to improved modularity and adherence to established patterns.
-   **Reduced Technical Debt:** Elimination of identified critical gaps and structural issues.
-   **Successful Telegram Integration:** Seamless integration of Telegram messaging into the unified communications platform.

## Quick Start Guide

To begin the architectural overhaul, focus on **Phase 0: Foundation**.

1.  **Database RLS:** Start by implementing RLS policies on the `teams` table and other critical team-scoped tables. This is a fundamental security enhancement.
2.  **API CORS:** Immediately tighten the API's CORS configuration to prevent potential security risks.
3.  **Telegram Consolidation:** Make a definitive decision and implement the consolidation of `apps/telegram-bot` into `apps/worker` or a new `packages/telegram`.

These initial steps will lay a solid, secure foundation for subsequent phases of the redesign.