## Summary
Audit the Drizzle schema against the live Supabase database, reconcile any drift with targeted migrations, then regenerate the shared Supabase type definitions.

## Plan
1. **Capture Baselines**  
   • Ensure `SUPABASE_DB_URL` / `DATABASE_URL` env vars point at the remote instance.  
   • Run `bunx supabase db dump --schema public --data false --project-id zvatkstmsyuytbajzuvn --file drizzle/remote-schema.sql` to snapshot Supabase.  
   • Run `bunx drizzle-kit diff --config drizzle.config.ts --out drizzle/diff-remote.sql` (verify command availability) to see the generated diff from local schema to remote.

2. **Analyse Differences**  
   • Review `drizzle/diff-remote.sql` + the dump to catalogue: missing tables, extra tables, column/type mismatches, enums, constraints, indexes.  
   • Cross-check against `packages/database/src/schema.ts` to decide which source of truth each discrepancy should follow.  
   • Document a reconciliation checklist (local additions vs remote removals) to drive edits.

3. **Reconcile Schema**  
   • Update `schema.ts` (and related query files if needed) so definitions reflect the intended final shape.  
   • Generate a new migration via `bunx drizzle-kit generate --config drizzle.config.ts` producing `drizzle/0007_*.sql`.  
   • Inspect the migration, then apply with `bunx drizzle-kit push --config drizzle.config.ts` to align Supabase (or run migrations via existing pipeline if preferred).  
   • Verify the `drizzle_migrations` table (or CLI output) shows the new tag.

4. **Regenerate Supabase Types**  
   • Execute `bun run db:types` to refresh `packages/supabase/src/types/database.ts`.  
   • Open the file to confirm UTF-8 output and that new/removed tables & enums appear.

5. **Validation**  
   • Run `bun run typecheck` (and `bun run lint` if time) to ensure the updated schema/types integrate cleanly.  
   • Spot-check critical queries or API routes for type changes that may require adjustments.

Let me know if you want any step adjusted or if I should proceed with the implementation.