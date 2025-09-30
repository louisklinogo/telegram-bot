# Schema V2 Migration Summary

**Date**: September 30, 2025  
**Project**: Cimantikós Clothing Company Admin Dashboard  
**Status**: ✅ **Completed Successfully**

---

## 🎯 Migration Goals

1. Standardize all database field names to `snake_case`
2. Add required `whatsapp` field for marketing campaigns
3. Add `garment_type` field to measurements (suit, kaftan, shirt, trouser, agbada, two_piece)
4. Implement soft deletes with `deleted_at` timestamps
5. Add comprehensive constraints and validation
6. Implement GHS (Ghana Cedis) currency formatting
7. Auto-calculate order balances via database triggers
8. Improve measurement structure with dual-value support (e.g., "40/42")

---

## 📊 Database Changes

### **Tables Recreated**
All tables were dropped and recreated with the new schema:

#### **1. Clients Table**
```sql
- Added: whatsapp VARCHAR(50) NOT NULL (required for marketing)
- Added: deleted_at TIMESTAMPTZ (soft deletes)
- Constraint: At least one contact method required (phone/whatsapp/email)
- Indexes: name, phone, whatsapp, email, deleted_at
```

#### **2. Orders Table**
```sql
- Changed: status values (generated, in_progress, completed, cancelled)
- Added: completed_at TIMESTAMPTZ
- Added: cancelled_at TIMESTAMPTZ  
- Added: deleted_at TIMESTAMPTZ
- Constraint: Positive amounts check
- Constraint: Deposit cannot exceed total
- Trigger: Auto-calculate balance_amount
```

#### **3. Invoices Table**
```sql
- Changed: status values (pending, sent, paid, overdue, cancelled)
- Added: deleted_at TIMESTAMPTZ
- Constraint: Amount must be positive
- Constraint: paid status requires paid_at timestamp
```

#### **4. Measurements Table**
```sql
- Added: garment_type VARCHAR(50) (suit, kaftan, shirt, trouser, agbada, two_piece)
- Added: deleted_at TIMESTAMPTZ
- Constraint: Valid garment_type check
- Structure: Supports dual values (e.g., chest: "40/42")
```

### **Measurement Codes**
Standard codes for measurement fields:
- **CH** - Chest (required, dual-value support)
- **ST** - Stomach (optional)
- **WT** - Waist (required)
- **HP** - Hip (optional)
- **LP** - Lap (required)
- **NK** - Neck (required)
- **SH** - Shoulder (required)
- **TL** - Top Length (required, dual-value support)
- **PL** - Trouser Length (required)
- **SL** - Sleeve Length (required)
- **BR** - Bicep Round (required)
- **AR** - Ankle Round (required)
- **CF** - Calf (optional)

### **Currency**
All monetary values are in **Ghana Cedis (GHS)**:
- `orders.total_price` - NUMERIC(10,2)
- `orders.deposit_amount` - NUMERIC(10,2)
- `orders.balance_amount` - NUMERIC(10,2) (auto-calculated)
- `invoices.amount` - NUMERIC(10,2)

---

## 💻 Code Changes

### **1. Drizzle Schema** (`packages/database/src/schema.ts`)
- ✅ Updated all tables to match SQL Schema V2
- ✅ Added `whatsapp` field to clients
- ✅ Added `garmentType` field to measurements
- ✅ Added `deletedAt` timestamps to all tables
- ✅ Updated status defaults (e.g., orders default to 'generated')
- ✅ Added indexes for all new fields

### **2. Admin Components**

#### **ClientSheet** (`apps/admin/src/components/client-sheet.tsx`)
- ✅ Added WhatsApp field (required)
- ✅ Added helper text: "Required for WhatsApp marketing campaigns"
- ✅ Updated form validation

#### **OrderSheet** (`apps/admin/src/components/order-sheet.tsx`)
- ✅ Updated status values: `generated`, `in_progress`, `completed`, `cancelled`
- ✅ Maintained proper status labels for UI display

#### **Orders Columns** (`apps/admin/src/app/orders/columns.tsx`)
- ✅ Added `formatCurrency()` for total_price display
- ✅ Updated `STATUS_VARIANTS` for snake_case values
- ✅ Added `STATUS_LABELS` for proper UI display
- ✅ Imported currency utilities

#### **Invoices Columns** (`apps/admin/src/app/invoices/columns.tsx`)
- ✅ Added `formatCurrency()` for amount display
- ✅ Updated `STATUS_VARIANTS` (pending, sent, paid, overdue, cancelled)
- ✅ Added `STATUS_LABELS` for proper UI display
- ✅ Removed obsolete 'draft' status

### **3. Currency Utilities**

#### **Created** (`apps/admin/src/lib/currency.ts`)
```typescript
formatCurrency(450.00)                           // "GHS 450.00"
formatCurrency(1250.50)                          // "GHS 1,250.50"
formatCurrency(15000, { shortFormat: true })     // "GHS 15K"
formatCurrency(null)                             // "GHS 0.00"
parseCurrency("GHS 450.00")                      // 450
calculateBalance(1000, 400)                      // 600
isValidCurrencyAmount(450)                       // true
```

#### **Documentation** (`docs/CURRENCY.md`)
- Complete usage guide
- Examples for Orders, Invoices, Dashboard
- Testing guidelines
- Future multi-currency considerations

---

## 🚀 Migration Execution

### **Migration Script** (`scripts/migrate-to-schema-v2.ts`)
```bash
bun scripts/migrate-to-schema-v2.ts
```

**Results:**
```
✅ Existing tables dropped
✅ Schema V2 tables created
✅ Sample data seeded
✅ 5 clients inserted
✅ 5 orders inserted
✅ 4 invoices inserted
✅ 3 measurement records inserted
```

### **Sample Data**
- **Clients**: Realistic Ghanaian names with WhatsApp numbers
- **Orders**: Various statuses (generated, in_progress, completed, cancelled)
- **Invoices**: Different statuses (pending, sent, paid)
- **Measurements**: Kaftan, Suit, and Shirt examples with dual values

---

## ✅ Testing Checklist

### **Development Server**
- [x] Server starts without errors
- [x] Runs on http://localhost:3001
- [ ] No TypeScript compilation errors
- [ ] No runtime errors in console

### **CRUD Operations to Test**

#### **Clients**
- [ ] Create new client (with required WhatsApp field)
- [ ] Edit existing client
- [ ] Delete client
- [ ] View client list with new data

#### **Orders**
- [ ] Create new order
- [ ] Edit order status (generated → in_progress → completed)
- [ ] View order with formatted currency (GHS)
- [ ] Check auto-calculated balance_amount
- [ ] Delete order

#### **Invoices**
- [ ] View invoices with currency formatting
- [ ] Check status badges (Pending, Sent, Paid, Overdue)
- [ ] Verify paid invoices have paid_at timestamp

#### **Measurements**
- [ ] Create measurement record
- [ ] Select garment_type from dropdown
- [ ] Enter dual-value measurements (e.g., "40/42")
- [ ] View measurement records

---

## 🔧 Files Modified

### **Database**
- `packages/database/src/schema.ts` - Drizzle schema updated

### **Migration Scripts**
- `scripts/schema-v2-drop-tables.sql` - Drop old tables
- `scripts/schema-v2-create-tables.sql` - Create new schema
- `scripts/schema-v2-seed-sample-data.sql` - Sample data
- `scripts/migrate-to-schema-v2.ts` - Migration runner

### **Admin Components**
- `apps/admin/src/components/client-sheet.tsx` - Added WhatsApp field
- `apps/admin/src/components/order-sheet.tsx` - Updated status values
- `apps/admin/src/app/orders/columns.tsx` - Currency + status updates
- `apps/admin/src/app/invoices/columns.tsx` - Currency + status updates

### **New Files**
- `apps/admin/src/lib/currency.ts` - Currency utilities
- `docs/CURRENCY.md` - Currency documentation
- `docs/SCHEMA-V2-MIGRATION.md` - This document

---

## 🎯 Next Steps

### **Immediate (Phase 11 & 12)**
1. **Invoice Operations** (Phase 11)
   - Implement "Mark as Paid" functionality
   - Add payment date tracking
   - Implement "Send Reminder" via WhatsApp
   - Download invoice PDFs

2. **Measurements CRUD** (Phase 12)
   - Create measurement sheet component
   - Add garment type selector
   - Implement dual-value input fields
   - Build measurement display cards

### **Future Enhancements**
1. Dashboard statistics with currency formatting
2. Order filtering by status
3. Invoice aging reports (overdue tracking)
4. WhatsApp marketing campaign integration
5. Measurement comparison across garment types
6. Client history timeline
7. Revenue reports with GHS totals

---

## 📝 Notes

### **Breaking Changes**
1. All status values now use snake_case in database (displayed properly in UI)
2. WhatsApp field is now required for all clients
3. Old measurement records without garment_type will need manual update

### **Backward Compatibility**
- None (fresh migration, all old data replaced with new schema)
- Old queries using camelCase field names will break
- Components expecting old status values need updates

### **Performance**
- All critical fields are indexed
- Triggers handle auto-calculations efficiently
- Soft deletes prevent data loss while maintaining query performance

---

## 🆘 Troubleshooting

### **Common Issues**

**Issue**: WhatsApp field validation error  
**Solution**: Ensure WhatsApp is provided when creating/editing clients

**Issue**: Status badge not displaying correctly  
**Solution**: Verify status value matches snake_case (generated, in_progress, completed, cancelled)

**Issue**: Currency not formatting  
**Solution**: Check that `formatCurrency` is imported from `@/lib/currency`

**Issue**: Order balance not calculating  
**Solution**: Database trigger should handle this automatically; check database logs

---

## 📚 Documentation References

- [Currency Guidelines](./CURRENCY.md) - Complete currency formatting guide
- [Drizzle Schema](../packages/database/src/schema.ts) - Current database structure
- [Schema SQL](../scripts/schema-v2-create-tables.sql) - Raw SQL schema

---

**Migration completed successfully on September 30, 2025** 🎉  
**Database**: Supabase (PostgreSQL)  
**Currency**: Ghana Cedis (GHS)  
**Status**: Ready for development
