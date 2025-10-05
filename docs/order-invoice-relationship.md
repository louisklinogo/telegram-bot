# Order → Invoice Relationship Analysis

## Your Current Data Model

### **Orders Table**
```typescript
orders {
  id: uuid
  team_id: uuid (FK)
  client_id: uuid (FK)
  order_number: varchar
  status: varchar  // "generated", "in_progress", "completed", "cancelled"
  total_price: numeric  // Sum of all order items
  deposit_amount: numeric  // Partial payment received
  balance_amount: numeric  // Remaining to be paid
  notes: text
  due_date: timestamp
  created_at: timestamp
}
```

### **Order Items Table** (Separate table - proper relational!)
```typescript
order_items {
  id: uuid
  order_id: uuid (FK → orders)
  name: text  // "Kaftan", "Agbada", "Trouser"
  quantity: integer  // 1, 2, 3
  unit_price: numeric  // 500.00
  total: numeric  // quantity * unit_price
  created_at: timestamp
}
```

**Relationship:** `orders` 1 → many `order_items`

---

### **Invoices Table**
```typescript
invoices {
  id: uuid
  team_id: uuid (FK)
  order_id: uuid (FK → orders) // ⭐ Links to order!
  invoice_number: varchar
  amount: numeric  // Amount to bill
  status: varchar  // "pending", "sent", "paid", "overdue", "cancelled"
  due_date: timestamp
  paid_at: timestamp (nullable)
  invoice_url: text  // PDF link
  notes: text
  created_at: timestamp
}
```

**Key insight:** Invoices don't have their own line items - they **reference the order's line items**!

---

## Current Flow

```
1. Create Order
   ├── Select Client
   ├── Add Line Items (Kaftan ₵500 x 2 = ₵1000)
   ├── Add Line Items (Trouser ₵300 x 1 = ₵300)
   ├── Total Price: ₵1300
   ├── Deposit: ₵500 (paid upfront)
   └── Balance: ₵800 (remaining)

2. Create Invoice (for the order)
   ├── Select Order → Auto-fills:
   │   ├── Client: (from order)
   │   ├── Amount: ₵800 (order.balance_amount)
   │   └── Line Items: (from order_items)
   ├── Set Due Date
   ├── Add Notes
   └── Create Invoice
```

---

## OrderSheet Implementation

**File:** `apps/admin/src/components/order-sheet.tsx`

**Features:**
```typescript
// 1. Dynamic Line Items (local state)
const [items, setItems] = useState<OrderItem[]>([
  { name: "", quantity: 1, unit_cost: 0, total_cost: 0 }
]);

// 2. Add/Remove Items
const addItem = () => setItems([...items, emptyItem]);
const removeItem = (index) => setItems(items.filter((_, i) => i !== index));

// 3. Auto-calculate totals
const updateItem = (index, field, value) => {
  // When quantity or unit_cost changes, recalculate total_cost
  if (field === "quantity" || field === "unit_cost") {
    newItems[index].total_cost = quantity * unit_cost;
  }
};

// 4. Calculate order totals
const totalPrice = items.reduce((sum, item) => sum + item.total_cost, 0);
const balanceAmount = totalPrice - formData.deposit_amount;

// 5. Save to database
const orderData = {
  items: validItems,  // Array of line items
  totalPrice,
  depositAmount,
  balanceAmount,
};
```

**On edit:** Loads existing order items from `order_items` table via tRPC query.

---

## Invoice Builder Requirements

Based on your schema, the invoice builder should:

### **Option 1: Invoice from Order (Most Common)**

```typescript
<InvoiceSheet>
  <Form>
    {/* 1. Select Order */}
    <OrderSelect 
      onChange={(order) => {
        setAmount(order.balance_amount);  // Auto-fill balance
        setClient(order.client);
        setOrderItems(order.items);  // Display items (read-only)
      }}
    />

    {/* 2. Display Order Items (Read-Only) */}
    {orderItems.map(item => (
      <div>{item.name} - ₵{item.total}</div>
    ))}

    {/* 3. Amount (pre-filled from order) */}
    <Input value={amount} readOnly />  {/* or editable? */}

    {/* 4. Due Date */}
    <DatePicker value={dueDate} onChange={setDueDate} />

    {/* 5. Notes */}
    <Textarea value={notes} onChange={setNotes} />

    {/* 6. Submit */}
    <Button onClick={createInvoice}>Create Invoice</Button>
  </Form>
</InvoiceSheet>
```

**Flow:**
1. Select order → Auto-fills amount, client, shows items
2. Set due date
3. Add notes (terms, payment instructions)
4. Create invoice

**Result:**
- Invoice references order (order_id)
- Shows order's line items when viewing invoice
- Tracks payment status separately

---

### **Option 2: Standalone Invoice (No Order)**

For cases where you invoice without an order (e.g., ad-hoc billing):

```typescript
<InvoiceSheet>
  <Form>
    {/* 1. Select Client */}
    <ClientSelect onChange={setClient} />

    {/* 2. Amount (manual entry) */}
    <Input 
      type="number" 
      value={amount} 
      onChange={setAmount}
      placeholder="Enter amount"
    />

    {/* 3. Description */}
    <Textarea 
      placeholder="What is this invoice for?" 
      value={description}
      onChange={setDescription}
    />

    {/* 4. Due Date */}
    <DatePicker value={dueDate} onChange={setDueDate} />

    {/* 5. Submit */}
    <Button onClick={createInvoice}>Create Invoice</Button>
  </Form>
</InvoiceSheet>
```

**Result:**
- Invoice with no order_id (null)
- Just amount + description
- Simpler use case

---

## Recommended Invoice Builder Design

### **Simple 2-Mode Approach:**

```typescript
export function InvoiceSheet({ open, onOpenChange }) {
  const [mode, setMode] = useState<"from-order" | "manual">("from-order");

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetHeader>
        <SheetTitle>Create Invoice</SheetTitle>
        
        {/* Mode Switcher */}
        <Tabs value={mode} onValueChange={setMode}>
          <TabsList>
            <TabsTrigger value="from-order">From Order</TabsTrigger>
            <TabsTrigger value="manual">Manual</TabsTrigger>
          </TabsList>
        </Tabs>
      </SheetHeader>

      {mode === "from-order" ? (
        <InvoiceFromOrderForm />
      ) : (
        <ManualInvoiceForm />
      )}
    </Sheet>
  );
}
```

---

## Invoice Display (View)

When viewing an invoice:

```typescript
<InvoiceDetails invoice={invoice}>
  {/* Header */}
  <h2>Invoice #{invoice.invoice_number}</h2>
  <Badge>{invoice.status}</Badge>

  {/* Client Info */}
  <ClientCard client={invoice.order.client} />

  {/* Line Items (from linked order) */}
  {invoice.order_id && (
    <LineItemsDisplay>
      {invoice.order.items.map(item => (
        <LineItem key={item.id}>
          <span>{item.name}</span>
          <span>{item.quantity} × ₵{item.unit_price}</span>
          <span>₵{item.total}</span>
        </LineItem>
      ))}
    </LineItemsDisplay>
  )}

  {/* Totals */}
  <InvoiceTotals>
    <div>Total: ₵{invoice.order.total_price}</div>
    <div>Deposit: ₵{invoice.order.deposit_amount}</div>
    <div>Invoice Amount: ₵{invoice.amount}</div>
  </InvoiceTotals>

  {/* Payment Status */}
  <PaymentStatus invoice={invoice} />
</InvoiceDetails>
```

---

## Key Differences from Midday

| Feature | Midday | Your App |
|---------|--------|----------|
| **Line Items** | In invoice itself | In linked order |
| **Structure** | Invoice has own line items | Invoice references order's items |
| **Use Case** | Flexible invoicing | Order-based invoicing |
| **Complexity** | High (templates, PDF, email) | Medium (simpler workflow) |

**Your model is SIMPLER and BETTER for your use case!**

Why:
- ✅ Orders already have line items
- ✅ No need to re-enter items in invoice
- ✅ Single source of truth (order_items table)
- ✅ Invoice is just a billing document for the order

---

## Implementation Steps

### **Phase 1: Basic Invoice Creation (30 min)**

1. Create `InvoiceSheet` component:
   - Order selector (dropdown)
   - Amount field (auto-filled from order.balance_amount)
   - Due date picker
   - Notes textarea

2. Create tRPC mutation:
   ```typescript
   invoices.create({
     orderId,
     amount,
     dueDate,
     notes,
   })
   ```

3. Wire up button:
   ```typescript
   <Button onClick={() => setInvoiceSheetOpen(true)}>
     New Invoice
   </Button>
   ```

### **Phase 2: Invoice Display (20 min)**

1. Create `InvoiceSheet` for viewing:
   - Show invoice details
   - Show linked order items
   - Show payment status
   - Mark as paid button

### **Phase 3: Manual Invoice (Optional)**

1. Add "Manual Invoice" tab
2. Simple form without order

---

## Summary

**Your current model:**
```
Order (with line items) → Invoice (references order)
```

**Invoice builder should:**
1. ✅ Select order → Auto-fill amount
2. ✅ Display order's line items (read-only)
3. ✅ Set due date and notes
4. ✅ Create invoice

**NO need to:**
- ❌ Re-enter line items (they're in order already!)
- ❌ Complex templates (keep it simple)
- ❌ Drag-and-drop (not needed)

---

**Want me to build the simple invoice creator now?** It'll be much simpler than Midday since you already have orders with line items! 🚀
