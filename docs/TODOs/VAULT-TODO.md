# Vault Feature - Remaining Tasks

## 🔥 Priority Features

### 1. **Midday-Style Short Links System** (Not Implemented)

**Current State:**
- ✅ Basic share functionality works (generates Supabase signed URL)
- ✅ Copy to clipboard with success feedback
- ❌ No custom branded download page
- ❌ No short link system
- ❌ URLs expire after 30 days but not tracked

**Midday Implementation:**
- Custom short links (e.g., `app.cimantikos.com/s/abc123`)
- Branded download page showing:
  - Company logo
  - "TeamName has shared a file with you"
  - File name, size, type
  - Download button with icon
  - Expiry notice
- Database table to track links
- Analytics potential (views, downloads)

**What's Needed:**

#### Database Schema:
```sql
CREATE TABLE short_links (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  short_id TEXT UNIQUE NOT NULL,  -- nanoid(8)
  url TEXT NOT NULL,              -- Supabase signed URL
  type TEXT,                      -- 'download' | 'redirect'
  file_name TEXT,
  mime_type TEXT,
  size NUMERIC(10, 2),
  team_id UUID REFERENCES teams(id) ON DELETE CASCADE,
  user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX idx_short_links_short_id ON short_links(short_id);
CREATE INDEX idx_short_links_team_id ON short_links(team_id);
```

#### Backend (tRPC):
```typescript
// apps/api/src/trpc/routers/short-links.ts
export const shortLinksRouter = createTRPCRouter({
  createForDocument: teamProcedure
    .input(z.object({
      documentId: z.string(),
      filePath: z.string(),
      expireIn: z.number(), // seconds
    }))
    .mutation(async ({ ctx, input }) => {
      // 1. Get document details
      // 2. Create Supabase signed URL
      // 3. Generate short ID (nanoid)
      // 4. Store in short_links table
      // 5. Return: app.cimantikos.com/s/{shortId}
    }),
  
  get: publicProcedure
    .input(z.object({ shortId: z.string() }))
    .query(async ({ ctx, input }) => {
      // Fetch short link by shortId
      // Check expiry
      // Return file metadata
    }),
});
```

#### Frontend:
```typescript
// apps/admin/src/app/(public)/s/[shortId]/page.tsx
export default async function SharePage({ params }) {
  const data = await getShortLink(params.shortId);
  
  // Check expiry
  if (expired) return <ExpiredPage />;
  
  return (
    <div>
      <Logo />
      <h1>Download File</h1>
      <p>{data.teamName} has shared a file with you</p>
      
      <FileInfo name={data.fileName} size={data.size} />
      
      <Button href={data.url} download>
        Download File
      </Button>
      
      <p>This link will expire</p>
    </div>
  );
}
```

#### Dependencies:
- `nanoid` - Short ID generation
- Database migration
- Public route handling

**Estimated Time:** 2-3 hours

---

## 📊 Medium Priority

### 2. **Document Relations UI**
Link documents to orders, invoices, clients

**What's Needed:**
- Dropdown in upload dialog to select order/invoice/client
- Show related docs in order/invoice detail pages
- Filter documents by relation
- Database fields already exist (orderId, invoiceId, clientId)

**Estimated Time:** 1 hour

---

## 🔍 Low Priority

### 3. **File Type Filter**
Filter by PDF, images, archives, etc.

**What's Needed:**
- Add file type submenu to FilterDialog
- Checkbox items for common types:
  - PDFs
  - Images (jpg, png, etc.)
  - Documents (docx, txt)
  - Archives (zip, rar)
  - Videos
  - Other
- Update tRPC query to filter by mimeType patterns

**Estimated Time:** 30 minutes

---

### 4. **Folder Organization**
Virtual folders for organizing documents

**Options:**
- **Option A**: Tag-based folders (use existing tags)
- **Option B**: Actual folder structure in pathTokens
- **Option C**: Folder table with hierarchy

**Estimated Time:** 2-4 hours depending on approach

---

### 5. **Document Processing** (Future)
AI auto-tagging, OCR, metadata extraction

**Ideas:**
- OCR for PDFs/images (extract text)
- AI-suggested tags based on content
- Auto-categorization (invoice, receipt, contract)
- Text search within documents
- Background job processing (Trigger.dev, Inngest, etc.)

**Estimated Time:** 8+ hours (requires background job infrastructure)

---

## ✅ Completed Features

- [x] Grid/List view toggle
- [x] Search with real-time filtering
- [x] Tag editing (inline + popover)
- [x] Date range filter (calendar picker)
- [x] Bulk selection (checkboxes + Zustand)
- [x] Bulk delete with confirmation
- [x] Active filter pills (animated)
- [x] File upload (drag & drop, progress)
- [x] Real-time updates (Supabase subscriptions)
- [x] Document preview icons
- [x] Actions menu (preview, download, share, delete)
- [x] Basic share links (Supabase signed URLs)
- [x] Toast notifications (Sonner with Midday design)
- [x] Skeleton loading states
- [x] Responsive design (mobile-friendly)

---

## 🎨 Design Polish

**Current Status:** ✅ Matches Midday design
- Vault cards (h-72, preview area, tags at bottom)
- Search bar (filter icon inside)
- Filter dropdown (nested submenus)
- Active filter pills (hover animations)
- Toast notifications (bottom-left, custom styling)
- Calendar picker (range selection)
- Bulk action bar (animated slide-up)

---

## 📝 Notes

**Reference:** `midday-assistant-v2/apps/dashboard/src/components/vault/`

**Key Files:**
- `vault-item.tsx` - Card component
- `vault-search-filter.tsx` - Search + filters
- `vault-item-actions.tsx` - Action buttons
- `short-links.ts` - Short link system (database + tRPC)
- `/s/[shortId]/page.tsx` - Public download page

**Dependencies Needed for Full Implementation:**
```json
{
  "nanoid": "^5.0.0"  // For short ID generation
}
```

**Database Migrations:**
```bash
# Create short_links table
bun run db:generate
bun run db:push
```

---

## 🚀 Quick Wins (30 min or less)

1. **File type filter** - Add to existing FilterDialog
2. **Document count badge** - Show total documents in header
3. **Empty state improvements** - Better illustrations/copy
4. **Keyboard shortcuts** - Cmd+K for search, Esc to clear
5. **Sort options** - Name, date, size (currently only by date)
6. **View preferences** - Remember grid/list choice in localStorage

---

**Last Updated:** 2024
**Status:** Production-ready for basic use, enhancements pending
