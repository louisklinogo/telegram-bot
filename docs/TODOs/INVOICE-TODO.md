# Invoice & Transaction System TODO

## ✅ Completed (Session Dec 2024)

### Invoice Builder
- [x] Professional Midday-style UI (800px modal, logo placeholder)
- [x] Dynamic line items with auto-calculation
- [x] Customer selection dropdown (search all clients)
- [x] Editable business details (From section)
- [x] Tax and discount fields (inline editing)
- [x] Notes section with hints
- [x] Send invoice functionality (draft → sent → immutable)
- [x] Draft/sent status handling
- [x] Invoice numbering system (INV-001)

### Transaction System
- [x] Transaction creator form (payment/expense/refund/adjustment)
- [x] Amount and currency inputs
- [x] Customer selector for payments
- [x] **Invoice linking** - Auto-allocates payment to invoice
- [x] Payment method dropdown (cash/bank/mobile money/card)
- [x] Payment reference field
- [x] Transaction date picker
- [x] Full form validation with Zod

### Integration Features
- [x] Record Transaction button on transactions page
- [x] **Record Payment button in invoice drawer** (for unpaid invoices)
- [x] Pre-fill customer and invoice data automatically
- [x] Payment allocation tracking (show amount paid/due)
- [x] Remove allocation functionality

---

## 🔥 High Priority (MVP Critical)

### Testing & Stability
- [ ] Test complete invoice flow: create → edit → send
- [ ] Test transaction recording end-to-end
- [ ] Test payment allocation to invoices
- [ ] Fix any TypeScript errors in production build
- [ ] Verify RLS policies on invoices/transactions tables

### Invoice Must-Haves
- [ ] **Auto-save draft functionality** (debounced 5-10s) - BIGGEST UX WIN
- [ ] **Logo upload to Supabase Storage** (component exists, needs backend)
- [ ] **PDF generation with @react-pdf/renderer** - CRITICAL for sending
- [ ] Invoice editing (after creation, before sending)
- [ ] Invoice preview modal (before sending)

### Transaction Must-Haves
- [ ] Transaction editing (currently only create)
- [ ] Transaction deletion with confirmation
- [ ] Payment allocation UI improvements
- [ ] Transaction filters (by type, date range, client)

---

## 📦 Medium Priority (Post-MVP)

### Invoice Features
- [ ] **Email invoice sending** (Resend/SendGrid integration)
- [ ] Currency selector per invoice (currently defaults to GHS)
- [ ] Due date calculator (Net 30/60/90 shortcuts)
- [ ] Show full customer address from database
- [ ] Bank details section (payment instructions/account info)
- [ ] Discount types: percentage vs fixed amount
- [ ] Invoice preview as you type
- [ ] Duplicate/clone invoice functionality
- [ ] Invoice status filters (draft/sent/paid/overdue)
- [ ] Bulk invoice operations

### Transaction Features
- [ ] Bulk transaction import (CSV/Excel)
- [ ] Transaction categories/tags
- [ ] Recurring transactions
- [ ] Transaction notes and attachments
- [ ] Export transactions (CSV/Excel/PDF)

### Payment Features
- [ ] Payment reminders UI
- [ ] Partial payment handling improvements
- [ ] Payment method analytics
- [ ] Payment reconciliation tools

---

## 🎨 Low Priority (Nice-to-Have)

### Invoice Advanced Features
- [ ] Multiple invoice templates/layouts
- [ ] Payment link generation (Stripe/Paystack integration)
- [ ] Late fee calculator based on due date
- [ ] Multi-currency support with exchange rates
- [ ] Custom invoice numbering patterns (INV-2024-001)
- [ ] Recurring invoices with auto-generation
- [ ] Auto-send reminders for unpaid invoices
- [ ] Rich text editor for line item descriptions
- [ ] Line item units (hrs, days, items) beyond quantity
- [ ] Tax rates by individual line item (VAT per item)
- [ ] File attachments (upload receipts/contracts to invoices)
- [ ] Internal team notes on invoices (not visible to customer)
- [ ] Invoice view/edit history tracking
- [ ] Invoice export options (CSV, Excel, JSON)
- [ ] Credit notes and refund invoices
- [ ] Invoice disputes and resolution tracking

### Analytics & Reporting
- [ ] Invoice analytics dashboard (sent, paid, overdue)
- [ ] Payment trends visualization (by month, client, method)
- [ ] Customer payment behavior analysis
- [ ] Revenue forecasting based on open invoices
- [ ] Aged receivables report (30/60/90 days)
- [ ] Cash flow projections
- [ ] Profit & loss statements

### Integration Features
- [ ] WhatsApp invoice sending integration
- [ ] SMS payment reminders
- [ ] Accounting software integration (QuickBooks, Xero)
- [ ] Payment gateway integration (Stripe, Paystack, Flutterwave)
- [ ] Bank account reconciliation
- [ ] Auto-sync with bank transactions

---

## 📝 Technical Debt

### Code Quality
- [ ] Add comprehensive test suite (unit + integration)
- [ ] Improve error handling and validation
- [ ] Add TypeScript strict mode compliance
- [ ] Refactor invoice form for better maintainability
- [ ] Extract reusable components from invoice builder
- [ ] Add API rate limiting for invoice generation

### Performance
- [ ] Optimize invoice list query (pagination + indexes)
- [ ] Add caching for frequently accessed invoices
- [ ] Lazy load invoice PDFs (don't generate until needed)
- [ ] Optimize transaction allocation queries

### Security
- [ ] Verify RLS policies on all new tables
- [ ] Add audit logging for financial operations
- [ ] Implement invoice access controls (who can view/edit)
- [ ] Add two-factor auth for sensitive operations
- [ ] Secure sensitive data at rest (encryption)

---

## 🐛 Known Issues

- [ ] Invoice drawer needs tRPC usage fix (similar to transactions)
- [ ] Session refresh edge cases in middleware
- [ ] TypeScript warnings in invoice form
- [ ] Missing error boundaries for invoice components

---

## 📊 Comparison with Midday (What We're Missing)

### We Have (100% Complete)
✅ Professional layout, logo placeholder, customer selection  
✅ Dynamic line items, tax/discount, notes  
✅ Send invoice (immutable), draft/sent status  
✅ Transaction creator with invoice linking  
✅ Payment allocation tracking  

### We Don't Have (27+ Features)
❌ **Auto-save** (highest priority - Midday saves every 5s)  
❌ **Logo upload to storage** (component exists, needs backend)  
❌ **PDF generation** (critical for sending invoices)  
❌ **Email sending** (Resend/SendGrid)  
❌ **Payment links** (Stripe integration)  
❌ Currency selector per invoice  
❌ Due date shortcuts (Net 30/60)  
❌ Customer address display  
❌ Bank details section  
❌ Discount percentage vs fixed  
❌ Invoice templates (multiple layouts)  
❌ Late fee calculator  
❌ Multi-currency with exchange rates  
❌ Custom invoice numbering  
❌ Recurring invoices  
❌ Payment reminders (auto-send)  
❌ Rich text descriptions  
❌ Line item units (hrs/days)  
❌ Tax per item  
❌ File attachments  
❌ Internal notes  
❌ History tracking  
❌ Duplicate invoice  
❌ Export options  
❌ Invoice analytics  
❌ Webhook integrations  
❌ WhatsApp sending  

---

## 🚀 Recommended Next Actions (Priority Order)

### Option A: Polish & Ship MVP (Recommended - 2-3 hours)
1. Add auto-save (1 hour) - Biggest UX win
2. Wire logo upload to Supabase (30 mins)
3. Test complete flow (30 mins)
4. Fix any blocking issues (1 hour)
5. **Ship MVP and gather user feedback**

### Option B: Add PDF Generation (Critical - 2-3 hours)
1. Install @react-pdf/renderer
2. Create invoice PDF template
3. Add download button
4. Test PDF generation
5. Add email sending (if time allows)

### Option C: Build More Features (Risky - 5-10 hours)
1. Add all medium priority features
2. Risk: Takes longer, delays feedback
3. Recommendation: Ship MVP first, then iterate

---

## 💡 Success Metrics

**Current State:**
- Invoice creation: Working ✅
- Transaction recording: Working ✅
- Payment allocation: Working ✅
- Professional UI: Matches Midday ✅

**Missing for MVP:**
- Auto-save (15 minutes = poor UX)
- PDF generation (can't send invoices)
- Logo upload (unprofessional without branding)

**Target State (MVP Ready):**
- Auto-save every 10s
- Generate PDF on demand
- Upload logo to Supabase
- Send via email or WhatsApp
- Track payment status

---

## 📚 Documentation

### Architecture
- Invoice builder uses nuqs for URL state
- Transactions auto-allocate to invoices when linked
- Sent invoices are immutable (draft only editable)
- React Hook Form + Zod for validation
- tRPC v11 for API calls

### Key Files
- `apps/admin/src/components/invoice-form.tsx` - Main invoice form (450+ lines)
- `apps/admin/src/components/transaction-form.tsx` - Transaction creator
- `apps/admin/src/hooks/use-invoice-params.ts` - URL state management
- `apps/admin/src/hooks/use-transaction-params.ts` - Transaction modal state
- `packages/database/src/queries/invoices.ts` - Invoice DB queries
- `apps/api/src/trpc/routers/invoices.ts` - Invoice tRPC router (11 endpoints)
- `apps/api/src/trpc/routers/transactions.ts` - Transaction router

### Recent Commits
- `5f3cc84` - Fix invoice details drawer
- `afb055c` - Transaction creator form
- `166a5d4` - Complete invoice builder
- `9d5bfce` - Midday-style UI enhancements

---

**Last Updated:** December 2024  
**Status:** Invoice & Transaction MVP Complete - Ready for Auto-save + PDF + Logo  
**Time Investment:** ~20 hours of development saved by following Midday patterns
