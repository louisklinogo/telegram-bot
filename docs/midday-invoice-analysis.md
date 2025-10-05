# Midday Invoice Builder - Architecture Analysis

## Overview

Midday has a **sophisticated invoice creation system** with:
- Live preview as you type
- Drag-and-drop line items
- Auto-save drafts
- PDF generation
- Email sending
- Scheduling
- Templates

---

## Key Components

### 1. **Invoice Sheet** (Main Container)
**File:** `apps/dashboard/src/components/sheets/invoice-sheet.tsx`

**Pattern:**
```typescript
export function InvoiceSheet() {
  const { type, invoiceId } = useInvoiceParams(); // URL params
  const isOpen = type === "create" || type === "edit" || type === "success";

  return (
    <Sheet open={isOpen} onOpenChange={handleClose}>
      <FormContext defaultSettings={settings} data={invoice}>
        <InvoiceContent />  {/* The actual form */}
      </FormContext>
    </Sheet>
  );
}
```

**Key Features:**
- ✅ Uses URL params for state (`?type=create&invoiceId=xxx`)
- ✅ Loads default settings from database
- ✅ Loads draft if editing existing invoice
- ✅ Invalidates queries on close

---

### 2. **FormContext** (React Hook Form)
**File:** `apps/dashboard/src/components/invoice/form-context.tsx`

**Schema:**
```typescript
const invoiceFormSchema = z.object({
  id: z.string().uuid(),
  status: z.string(),
  template: invoiceTemplateSchema,  // Labels, currency, format
  fromDetails: z.any(),              // Your business info
  customerDetails: z.any(),          // Customer info
  customerId: z.string().uuid(),
  customerName: z.string().optional(),
  paymentDetails: z.any(),           // Bank details, etc.
  noteDetails: z.any().optional(),   // Terms & conditions
  dueDate: z.string(),
  issueDate: z.string(),
  invoiceNumber: z.string(),
  lineItems: z.array(lineItemSchema).min(1),  // Products/services
  amount: z.number(),                 // Total
  vat: z.number().nullable(),
  tax: z.number().nullable(),
  discount: z.number().nullable(),
  token: z.string().optional(),       // Security token
  scheduledAt: z.string().nullable(), // For scheduled sending
});
```

**Features:**
- Uses Zod for validation
- React Hook Form for state management
- Default values from database settings
- Supports draft loading

---

### 3. **Line Items** (Dynamic Array)
**File:** `apps/dashboard/src/components/invoice/line-items.tsx`

**Pattern:**
```typescript
const { fields, append, remove, swap } = useFieldArray({
  control,
  name: "lineItems",
});

// Drag-and-drop reordering with Framer Motion
<Reorder.Group values={fields} onReorder={reorderList}>
  {fields.map((field, index) => (
    <Reorder.Item key={field.id} value={field}>
      <ProductAutocomplete />    {/* Search products */}
      <QuantityInput />          {/* Number input */}
      <PriceInput />             {/* Currency input */}
      <Button onClick={() => remove(index)}>Remove</Button>
    </Reorder.Item>
  ))}
</Reorder.Group>

<Button onClick={() => append(emptyLineItem)}>Add Line</Button>
```

**Features:**
- ✅ Drag-and-drop reordering (Framer Motion)
- ✅ Product autocomplete (search existing products)
- ✅ Auto-calculate totals
- ✅ Remove lines (minimum 1)
- ✅ Add unlimited lines

---

### 4. **Auto-Save Draft**
**File:** `apps/dashboard/src/components/invoice/form.tsx`

**Pattern:**
```typescript
// Watch form values
const values = useWatch({ control });

// Debounce changes (3 seconds)
const [debouncedValues] = useDebounceValue(values, 3000);

// Auto-save on changes
useEffect(() => {
  if (debouncedValues) {
    draftInvoiceMutation.mutate(transformFormValuesToDraft(debouncedValues));
  }
}, [debouncedValues]);
```

**Features:**
- ✅ Auto-saves every 3 seconds
- ✅ Shows "Last saved X seconds ago"
- ✅ Prevents data loss
- ✅ Creates draft on first edit

---

### 5. **URL State Management**
**File:** `apps/dashboard/src/hooks/use-invoice-params.ts`

**Uses `nuqs` library for URL state:**
```typescript
const invoiceParamsSchema = {
  type: parseAsStringEnum(["edit", "create", "details", "success"]),
  invoiceId: parseAsString,
  selectedCustomerId: parseAsString,
};

export function useInvoiceParams() {
  const [params, setParams] = useQueryStates(invoiceParamsSchema);
  return { ...params, setParams };
}
```

**Usage:**
```typescript
// Open create sheet
setParams({ type: "create" });

// Open edit sheet
setParams({ type: "edit", invoiceId: "xxx" });

// Close sheet
setParams(null);
```

**Benefits:**
- ✅ Shareable URLs (can send link to specific invoice)
- ✅ Browser back/forward works
- ✅ Refresh preserves state
- ✅ Type-safe with Zod

---

### 6. **tRPC API Routes**
**File:** `apps/api/src/trpc/routers/invoice.ts`

**Key Mutations:**
```typescript
export const invoiceRouter = createTRPCRouter({
  // Get list of invoices
  get: protectedProcedure
    .input(getInvoicesSchema)
    .query(({ input, ctx }) => getInvoices(db, { ...input, teamId })),

  // Get single invoice
  getById: protectedProcedure
    .input(getInvoiceByIdSchema)
    .query(({ input, ctx }) => getInvoiceById(db, { ...input, teamId })),

  // Get default settings (template, currency, etc.)
  defaultSettings: protectedProcedure
    .query(async ({ ctx }) => {
      const template = await getInvoiceTemplate(db, teamId);
      const team = await getTeamById(db, teamId);
      const user = await getUserById(db, userId);
      const invoiceNumber = await getNextInvoiceNumber(db, teamId);
      
      return {
        id: uuidv4(),
        status: "draft",
        template: template || defaultTemplate,
        fromDetails: { ...team, ...user },
        invoiceNumber,
        // ... more defaults
      };
    }),

  // Save draft (auto-save)
  draft: protectedProcedure
    .input(draftInvoiceSchema)
    .mutation(({ input, ctx }) => {
      const invoiceNumber = input.invoiceNumber || await getNextInvoiceNumber(db, teamId);
      return draftInvoice(db, { ...input, invoiceNumber, teamId, userId });
    }),

  // Create final invoice
  create: protectedProcedure
    .input(createInvoiceSchema)
    .mutation(async ({ input, ctx }) => {
      // Handle delivery types: create, create_and_send, scheduled
      if (input.deliveryType === "scheduled") {
        // Schedule for later
        await scheduleInvoice(input);
      } else if (input.deliveryType === "create_and_send") {
        // Create and send immediately
        await createAndSendInvoice(input);
      } else {
        // Just create
        await createInvoice(input);
      }
    }),
});
```

---

## Architecture Highlights

### **1. URL-Based State Management**
Uses `nuqs` library for type-safe URL params:
- `?type=create` → Opens create sheet
- `?type=edit&invoiceId=xxx` → Opens edit sheet
- `?type=success&invoiceId=xxx` → Shows success message

**Why:** Shareable links, browser history, refresh-safe

---

### **2. Auto-Save with Debouncing**
- Watches form values
- Debounces changes (3 seconds)
- Auto-saves to `draft` status
- Shows "Last saved..." indicator

**Why:** Never lose data, seamless UX

---

### **3. Complex Form Structure**
```
Invoice Form
├── Template Settings (labels, format, currency)
├── From Details (your business)
├── Customer Details (select/create customer)
├── Line Items (dynamic array)
│   ├── Product autocomplete
│   ├── Quantity
│   ├── Price
│   └── Total (calculated)
├── Payment Details (bank info)
├── Note Details (terms & conditions)
├── Totals (subtotal, tax, VAT, discount, total)
└── Actions (save draft, create, schedule)
```

---

### **4. Live Preview**
The form IS the preview - styled to look like the final PDF:
- Real-time calculations
- Professional layout
- What you see is what you get (WYSIWYG)

---

### **5. PDF Generation**
Uses `@midday/documents` package:
- Server-side PDF generation
- Triggered after invoice creation
- Stored in Supabase Storage
- Emailed to customer

---

## What We Can Adapt

### **Simple Version for Your App:**

Given your simpler requirements (no scheduling, no PDF yet), we can build:

### **Phase 1: Basic Invoice Creation** (30-40 min)
```typescript
// 1. Create form with:
- Customer select (link to existing order)
- Amount (auto-filled from order if linked)
- Due date
- Payment method
- Notes

// 2. tRPC mutation:
invoices.create({ orderId, amount, dueDate, notes })

// 3. Sheet component:
<InvoiceSheet open={open} onClose={() => setOpen(false)}>
  <InvoiceForm onSubmit={handleCreate} />
</InvoiceSheet>
```

### **Phase 2: Enhanced Features** (Later)
- Line items with drag-and-drop
- Auto-save drafts
- PDF generation
- Email sending
- Templates

---

## Recommended Approach

### **Option 1: Simplified Invoice (RECOMMENDED)**
Build a basic invoice creation that matches YOUR current schema:

```typescript
// Your invoice schema (from schema.ts):
invoices = {
  id: uuid,
  order_id: uuid (optional),
  invoice_number: varchar,
  amount: numeric,
  status: varchar ("pending", "paid", "overdue"),
  due_date: timestamp,
  paid_at: timestamp (optional),
  paid_amount: numeric (optional),
  payment_method: varchar (optional),
  notes: text (optional),
}
```

**Form fields:**
1. Select order (optional) → Auto-fills customer + amount
2. Manual amount input (if no order)
3. Due date picker
4. Payment method dropdown
5. Notes textarea
6. Status (default: "pending")

**Flow:**
1. Click "New Invoice" button
2. Sheet opens with form
3. Fill form → Submit
4. tRPC creates invoice
5. Sheet closes, list refreshes

---

### **Option 2: Copy Midday's Full System** 
Adapt their entire invoice builder with line items, templates, PDF, etc.

**Pros:** Feature-rich, professional
**Cons:** Takes 3-4 hours, complex

---

## My Recommendation

**Start with Option 1 (Simple Invoice)**, then iterate:

1. **Now:** Basic create invoice form (30-40 min)
2. **Week 2:** Add line items support
3. **Week 3:** Add PDF generation
4. **Week 4:** Add email sending

This matches your current schema and lets you ship quickly!

**Want me to build the simple version first?** 🚀
