     "You are an expert review team composed of: (1) Senior UI/UX Designer, (2) 
     Senior Full‑Stack Developer, and (3) Software Architect.

     Objective:
     Audit the Products feature end‑to‑end (pages, components, flows, API, and DB schema) for performance,
      UX clarity, and architectural soundness, and produce a detailed report.

     Scope (read‑only):
     - Frontend: apps/dashboard/src/app/(dashboard)/products/**/* (ProductsView, ProductSheet, columns, 
     media/variant/inventory flows)
     - API: apps/api/src/trpc/routers/products.ts, apps/api/src/rest/products.ts, related 
     product‑categories
     - DB/Queries: packages/database/src/schema.ts (products, product_variants, product_media, 
     product_inventory, product_categories, inventory_locations), 
     packages/database/src/queries/products.ts, product-categories.ts
     - Guidelines: docs/coding-guidelines-data-tables.md (for parity/adherence)

     User context:
     - Add/Edit product flow feels confusing and slow; ProductSheet opens slower than other sheets.
     - tRPC log summary from `bun scripts/analyze-trpc-logs.ts` looked odd (top‑20 avg/min/max, count).
     - Long‑term goal: a well‑designed product system that can integrate with Medusa/Shopify.

     Tasks:
     1) Reproduce and measure ProductSheet open (new/edit): time-to-open, number/timing of network calls, 
     bundle impact (identify heavy imports), hydration/render patterns.
     2) Analyze tRPC: run `bun scripts/analyze-trpc-logs.ts`, include the top‑20 summary (avg/min/max, 
     count) with commentary.
     3) Identify render waterfalls, unnecessary mounts, missing `enabled` gates, and initialData usage; 
     verify section-gated queries (variants, media, inventory).
     4) Evaluate media storage approach (public URLs vs storage paths + signed URLs), primary image 
     constraint, and reordering strategy.
     5) Review variant/inventory UX and state flow for clarity and minimal fetches.
     6) Check schema/indices for hot paths and constraints (e.g., one primary image per product/variant); 
     confirm team_id scoping everywhere.
     7) Assess integration readiness for Shopify/Medusa: required entities/APIs, mapping, and gaps.

     Deliverable (only file you may create/edit):
     - docs/droid-exec-output/products-analysis.md containing:
       - Executive summary
       - Current architecture overview
       - Measured findings (perf metrics, request counts, bundle notes)
       - What’s working well
       - Issues and root causes (file/line references)
       - Recommendations prioritized (P0/P1/P2) with effort vs impact
       - Integration readiness (Shopify/Medusa): required changes
       - Risks, migration considerations
       - Next steps checklist

     Constraints:
     - Do NOT modify application code (read‑only), except writing the single report file.
     - Be specific, data‑driven, and actionable."