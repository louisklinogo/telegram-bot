# Monorepo Stabilization & Refactor Recovery Plan

## Objectives
- Make the monorepo robust: consistent workspaces, single lockfile, shared packages, and reproducible builds.
- Resolve TypeScript and Biome issues introduced during the refactor without regressing architecture.
- Establish a clean commit/PR path to land changes safely.

## Branching & Guardrails
- Work on branch: chore/monorepo-stabilization
- No pushes to remote unless you approve. All commits include co-author:
  Co-authored-by: factory-droid[bot] <138933559+factory-droid[bot]@users.noreply.github.com>

## Target Repo Layout (affirm)
- apps/
  - admin/ (Next.js 15 app)
  - telegram-bot/ (Mastra/Telegram runtime)
- packages/
  - domain/ (shared domain types only — one canonical set)
  - services/ (Supabase, Cloudinary, service helpers, plus supabase/types and CRUDs)
  - config/ (env validation & helpers)
- scripts/ (migrations & one-off scripts)
- data/ (local db artifacts)
- bun.lock at root only

## Phase 1 — Workspace & Config Hardening
1) Root package.json
   - Ensure workspaces: ["apps/*", "packages/*"].
   - Scripts:
     - dev:bot | build:bot | lint:bot | type-check:bot (cwd apps/telegram-bot)
     - dev:admin | build:admin | lint:admin | format:admin (cwd apps/admin)
2) Lockfiles
   - Keep only root bun.lock (apps/admin/bun.lock already removed; re-check none remains).
3) TypeScript
   - tsconfig.base.json stays the shared base (paths for @cimantikos/{config,services,domain}).
   - Ensure each app/package tsconfig extends base and sets local rootDir/outDir.

## Phase 2 — Domain & Services Consolidation
1) Remove duplicate type exports in packages/domain:
   - Conflict: agents/invoice vs types/invoiceGenerator exports (InvoiceItem, InvoiceItemInput, etc.).
   - Decision: Keep a single canonical set:
     - Canonical: packages/domain/src/types/invoiceGenerator.ts for the external invoice API DTOs.
     - Agent-only schemas: if agents/invoice has overlapping names, either:
       - a) Merge into types/invoiceGenerator and delete agents/invoice, or
       - b) Rename agent-specific exports (e.g., AgentInvoiceItem) and do NOT re-export them in the barrel.
   - Update packages/domain/src/index.ts to export only the canonical set to eliminate TS2308 duplicate export errors.
2) Ensure packages/services exports a stable surface:
   - src/index.ts re-exports: cloudinary, supabaseClient, supabaseDatabase, supabase/* (types + services CRUDs).
   - services depends on @cimantikos/config and @cimantikos/domain as needed.
3) packages/config
   - validateEnv: keep NEXT_PUBLIC_SUPABASE_URL/NEXT_PUBLIC_SUPABASE_ANON_KEY mapping logic.

## Phase 3 — Telegram Bot Build Fixes (TypeScript + Node APIs)
1) Node builtin imports
   - Replace require or bare imports with node: protocol where applicable:
     - fs/promises → node:fs/promises
     - path → node:path
     - os via node:os (avoid require("os")).
2) fileHandler.ts
   - Import fs/path via node: protocol.
   - Keep runtimeContext typed via RuntimeContext; ensure helpers return typed FileHandlerResult.
3) grammyHandler.ts
   - Define SendMessageOptions via `type SendMessageOptions = Parameters<Bot<Context>["api"]["sendMessage"]>[2];`
   - If typing is too strict, cast the options object at call site (minimal casts only).
4) invoiceGenerator.ts
   - Replace `response.buffer()` with `Buffer.from(await response.arrayBuffer())`.
   - Use node:https Agent as `_httpAgent` if not used; or remove it to avoid unused var.
   - Keep node:fs/node:path imports.
   - Remove unused imports from domain (only keep what’s used).
5) notionSearchTool.ts
   - Keep the row interfaces for clients/orders/measurements to remove `any` use.
6) Health check file will be addressed in Phase 4.

## Phase 4 — Health/Telemetry Cleanups
- src/health/healthCheck.ts
  - Replace `require("os")` usage with `import * as os from "node:os"` (or local require("node:os")).
  - Update totalmem(), freemem(), loadavg() calls accordingly.
  - If this file is large/noisy, we can temporarily exclude it from lint scope (see Phase 5) and clean it incrementally.

## Phase 5 — Biome Lint Strategy
1) Narrow scope temporarily to stabilize:
   - apps/telegram-bot/biome.json includes only src/api/**, src/mastra/**, src/server.ts (already mostly done).
   - Exclude heavy areas (health/, telegram/schemas.ts) temporarily.
2) Rules
   - Keep recommended rules; temporarily relax `noExplicitAny` / `noImplicitAnyLet` (already relaxed) while we remove any’s in touched files.
   - Keep Node style rules (useNodejsImportProtocol), we’ll fix them incrementally.
3) After TypeScript build is green, re-expand lint coverage gradually to the rest of src and re-enable stricter rules as feasible.

## Phase 6 — Admin App Check
1) Next.js turbopack root warning:
   - Option A: Set `turbopack.root` in apps/admin/next.config.ts to the repo root. Example:
     ```ts
     // next.config.ts
     const nextConfig = {
       experimental: {
         turbo: {
           // Turbopack config
         },
       },
       // Silence root warning
       turbopack: {
         root: "../../", // repo root relative to apps/admin
       },
     };
     export default nextConfig;
     ```
   - Option B: Ignore the warning if behavior is correct with single root lockfile (preferred minimal change).
2) Verify `supabase-browser.ts` uses NEXT_PUBLIC envs; env mapping is handled in config/validateEnv.
3) Build admin: `bun run build:admin` and fix any type/lint spillover.

## Phase 7 — Verification Sequence
- At root: `bun install`
- Telegram bot:
  - `bun run --cwd apps/telegram-bot type-check`
  - `bun run --cwd apps/telegram-bot lint` (with narrowed scope)
  - `bun run --cwd apps/telegram-bot build`
- Admin app:
  - `bun run build:admin`
  - `bun run lint:admin`
- Expand lint scope in `apps/telegram-bot/biome.json` gradually, fix warnings/errors, then re-run.

## Phase 8 — Commits & PR
- Logical commits:
  1) chore(workspace): harden workspaces, remove nested lockfile, align tsconfig
  2) feat(domain): consolidate invoice types; fix barrel exports
  3) feat(services): stable exports; supabase/cloudinary
  4) fix(bot): Node imports, tool typings, Response handling, search typing
  5) fix(health): node:os imports & utilities
  6) chore(lint): scope + rules; format pass
- Open PR against master with clear summary and risks.

## Questions / Clarifications
1) Domain types consolidation: okay to remove/rename duplicates (agents/invoice vs types/invoiceGenerator) so we have one canonical set?
2) Health/telemetry: okay to refactor `healthCheck.ts` Node imports and possibly trim some verbose metrics until re-linting is complete?
3) Lint policy: Should we keep temporarily relaxed rules (noExplicitAny/noImplicitAnyLet) during the transition, or enforce strict immediately and accept more refactors now?
4) Next.js turbopack.root: prefer explicit config or accept warning for now?

## After Approval — Execution Steps
- Create branch chore/monorepo-stabilization
- Implement Phase 2–7 changes in small commits.
- Save this plan to `.factory/docs/monorepo-stabilization-plan.md` and commit on that branch (as you requested).
- Report progress and any unexpected blockers before broadening lint coverage.

If you approve, I’ll save this plan file on the requested branch and begin the implementation as outlined above.