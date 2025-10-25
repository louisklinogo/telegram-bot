## Create `apps/website` - Marketing Landing Page

### Overview
Create a new Next.js 15 marketing website app in the monorepo, adapted from the v0 Brillance landing page, rebranded for Faworra.

### Architecture Pattern (Follows Midday)
```
apps/website/
├── src/
│   ├── app/
│   │   ├── layout.tsx
│   │   └── page.tsx
│   ├── components/
│   │   ├── hero-section.tsx
│   │   ├── features-section.tsx (adapted from v0's smart-simple-brilliant)
│   │   ├── unified-comms.tsx (adapted from v0's your-work-in-sync)
│   │   ├── integrations.tsx (adapted from v0's effortless-integration)
│   │   ├── testimonials-section.tsx
│   │   ├── faq-section.tsx
│   │   ├── pricing-section.tsx (optional)
│   │   ├── cta-section.tsx
│   │   └── footer-section.tsx
│   └── lib/
│       └── utils.ts
├── package.json (scoped: @Faworra/website)
├── tsconfig.json
├── tailwind.config.ts
├── postcss.config.js
└── next.config.mjs
```

### Implementation Steps

1. **Setup app structure** - Copy directory skeleton and Next.js config files
2. **Copy & adapt v0 components** - Keep UI/animations, replace all marketing copy with Faworra messaging:
   - Hero: "Unified Communications & Business Management Platform"
   - Features: Client management, Orders, Invoices, Transactions, WhatsApp/Instagram/SMS integration
   - Unified Comms: Show how messages from multiple channels are organized
   - Integrations: WhatsApp, Instagram, SMS, Stripe (if applicable)
   - Replace "Brillance" → "Faworra" throughout
3. **Create package.json** - Register workspace app, add dependencies (Next.js 15, Tailwind, shared UI if needed)
4. **Update root workspace** - Add `apps/website` to root package.json workspaces
5. **Setup dev command** - Add `dev:website` script to root package.json
6. **Adapt styling** - Use v0's Tailwind/globals.css as-is (already professional)
7. **Copy font setup** - Keep Inter + Instrument Serif from v0

### Content Changes (Not Code Structure)
- Replace all "Brillance" with "Faworra"
- Update value props to match platform (multi-tenant SaaS, unified comms, AI-assisted)
- Testimonials: Update to realistic customer quotes (can add later)
- CTA buttons: Point to admin login or signup flow
- Footer: Add company info, links, contact

### Integration Points
- Keep separate from admin app (no tRPC, no DB queries)
- Can be deployed independently to Vercel
- Reuse `@Faworra/ui` components if desired (optional - v0 is self-contained)
- No authentication needed (public marketing site)

### Dev Workflow
```bash
bun run dev          # Starts both admin + website (if added to scripts)
bun run dev:website  # Website only
cd apps/website && bun run build  # Production build
```

### File Sources
- Copy from: `v0-brillance-saa-s-landing-page/`
- Do NOT import from v0's node_modules (use monorepo Tailwind/Next.js)
- Keep globals.css styling as-is