# Engineering Constitution

## Principles
- Server‑first; fetch on server, pass initialData to clients. No client prefetch/hydration hacks.
- Single DB source of truth (Drizzle). Supabase reflects DB; no ad‑hoc schema edits.
- Strong typing end‑to‑end; zero `any` in app code. One Database type across workspace.
- Multi‑tenancy by default; all queries must be team‑scoped.

## Architecture & Data Flow
- Next.js Server Components for initial fetch; Client Components for interactivity only.
- tRPC for client data/mutations; REST only for webhooks/provider ops.
- Use database query modules (`packages/database/queries/*`) for complex reads.

## Auth & Multi‑tenancy
- Bearer token → middleware → context { userId, teamId, supabaseAdmin }.
- All DB access must filter by `team_id`. Never trust client‑provided team_id.
- No auto‑create tenants. 401 without token; 403 without team.

## Database & Migrations
- Drizzle migrations only. No direct SQL changes outside migrations.
- Keep schema enums/types minimal and explicit; avoid generic strings.
- Regenerate Supabase types after schema changes.

## Supabase & Types
- Pin a single compatible `@supabase/supabase-js` version.
- Export one Database type; use `SupabaseClient<Database>` everywhere.
- `.returns<T>()` at end of PostgREST chains only.

## API (REST/tRPC)
- REST: protected by auth/team middleware; minimal columns; no N+1.
- tRPC: all procedures require team context unless explicitly public.
- Messaging: enqueue to `communication_outbox`; workers deliver.

## Validation & Errors
- Validate inputs with Zod shared schemas. Reject early with 4xx.
- Standard error shape: `{ error: string }`. No stack traces to clients.

## Performance
- Use initialData pattern on every page. Avoid duplicate fetching.
- Create DB indexes for hot filters (team_id, status, timestamps).
- Keep selects lean; avoid `select *`.

## Security
- RLS on all tables except `users`, `teams` (as required).
- Service role keys only on server; never log secrets.
- Signed URLs for storage. Expire fast.

## Observability
- Structured logs at API/worker; include request id, team_id.
- Basic metrics: request counts, latency, error rate.

## CI/CD Gates
- CI must pass: typecheck, lint, build.
- Verify Supabase types match schema; fail on drift.
- Block PRs missing team_id filters in DB queries.

## Code Review & Branching
- Conventional commits; small focused PRs.
- Require reviewer acknowledgement of: auth, team scoping, types, validation.

## Prohibited Patterns
- Client‑side data prefetch for initial page loads.
- `any` in app code; untyped context access; `select *`.
- Unscoped queries (missing team_id), or ad‑hoc schema edits.

## Exceptions
- Document rationale and scope. Add temporary guardrails. Set a removal task.
