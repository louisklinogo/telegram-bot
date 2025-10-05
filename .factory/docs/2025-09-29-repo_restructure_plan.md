## Overview
Restructure the repository into a small Bun workspaces monorepo so the Telegram bot and Next.js admin app live under `apps/`, with cross-cutting logic shared via new `packages/` modules. Clean up scripts/data locations and align tooling (TypeScript/Bun) after the move.

## Planned Steps
1. **Define workspace layout**
   - Introduce root-level `bun.workspaces` (and matching `packageManager` config) so `apps/*` and `packages/*` are part of the same workspace.
   - Create `apps/telegram-bot/` and move current root TypeScript sources + configs (`src`, `tsconfig.json`, server entry, scripts) inside, keeping build output paths consistent.
   - Update root scripts to call through workspace (`bun run --cwd apps/telegram-bot …`) and ensure existing CI/dev commands stay equivalent.

2. **Create shared packages**
   - `packages/domain`: move type definitions (invoice, measurement, etc.) currently in `src/mastra/types` so both runtimes consume them.
   - `packages/services`: hold Supabase/Notion/Cloudinary clients and higher-level data helpers extracted from `src/config`, `src/mastra/tools`, `src/mastra/storage`.
   - `packages/config`: relocate env validation (`validateEnv.ts`) + schema logic, exporting plain helpers without side effects.
   - Add each package’s `package.json`, `tsconfig.json`, and index exports; switch imports in both apps to the new modules.

3. **Update app source code**
   - Fix import paths in Telegram bot (`apps/telegram-bot/src/**/*`) and admin app (`apps/admin/src/**/*`) to reference the packages; remove duplicated code now centrally provided.
   - Keep Mastra-specific glue logic within the telegram app, ensuring new package APIs remain framework-agnostic.

4. **Organize scripts and data**
   - Move `src/scripts` to top-level `scripts/` (or under `packages/scripts` if shared) and adjust script commands.
   - Relocate `.db` artifacts into a dedicated `data/` directory and update .gitignore accordingly.

5. **Tooling alignment**
   - Add root `tsconfig.base.json` consumed by app/package `tsconfig.json` files, setting shared compilerOptions and path mapping.
   - Ensure Biome and lint/format tasks operate per workspace: optional root Biome config referencing subprojects.
   - Verify Next.js lockfile warning: keep single root `bun.lock` and remove nested lockfiles, or configure `next.config.ts` `turbopack.root`.

6. **Validation**
   - Run lint/build for each workspace (`bun run --cwd apps/telegram-bot build`, `bun run --cwd apps/admin build`, package type-checks) to confirm structural changes.
   - Update tests/CI instructions in TODO (only if requested) to reflect new command locations.

## Risks & Mitigations
- **Path resolution breaks:** adopt TypeScript project references and incremental testing after each major move.
- **Circular dependencies in packages:** keep domain/services/config modules layered (config → services → apps) and document constraints.
- **Workspace script drift:** double-check Bun workspace behavior so commands resolve the correct dependencies.

Let me know if you want adjustments before implementation.