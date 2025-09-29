# Context Summary

- Set up `apps/admin` Next.js 15 project using Bun and Biome tooling.
- Initialized shadcn/ui with Tailwind CSS v4 theme and added core UI components (button, card, input, dropdown-menu, sheet, navigation-menu, collapsible, tooltip, badge, separator, skeleton, table, scroll-area).
- Implemented Supabase browser client helper and sidebar state context.
- Built expandable sidebar layout with navigation sections for Dashboard, Operations, Systems, and user account controls.
- Replaced landing page with dashboard overview cards, recent orders, and measurement schedule sections using shadcn components.
- Scaffolded placeholder pages for Clients, Orders, Invoices, Measurements, Files, Analytics, Health, Reports, and Settings with basic UI shells.
- Added shared `PageShell` wrapper for consistent page layout and header actions.
- Updated root scripts to include admin-specific `dev`, `build`, `lint`, and `format` commands leveraging Bun.
