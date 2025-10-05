# Bulk Actions & Advanced Features Implementation Plan 📋

## Overview

We're implementing 5 major features based on your image:
1. ✅ **Phone/WhatsApp with country codes** 
2. **Checkbox selection (row-level)**
3. **Bulk actions bar (Delete, Copy, Export)**
4. **Working Filter button**
5. **CSV Upload/Download**

---

## ✅ Already Created Components

### 1. Phone Input with Country Code
**File:** `apps/admin/src/components/phone-input.tsx`
- Uses `react-phone-number-input` library
- Auto country code formatting
- Default to Ghana (`GH`)
- Integrates with existing Input component

### 2. Bulk Actions Bar
**File:** `apps/admin/src/components/bulk-actions-bar.tsx`
- Fixed bottom bar (like your image)
- Shows count of selected items
- Actions: Delete, Copy, Export, Clear
- Auto-hides when nothing selected

### 3. Filter Sheet
**File:** `apps/admin/src/components/filter-sheet.tsx`
- Slide-out panel
- Filters: Referral Source, Has Orders, Revenue Range
- Apply/Clear buttons

### 4. CSV Upload/Download
**File:** `apps/admin/src/components/csv-upload.tsx`
- Upload CSV button
- Download template button
- Uses `papaparse` for CSV parsing
- Validates data before import

### 5. CSS Styles
**File:** `apps/admin/src/app/globals.css`
- Phone input styling added
- Clean integration with theme

---

## 🔨 Implementation Steps

### Step 1: Update Client Sheet (Phone Inputs)

**File:** `apps/admin/src/components/client-sheet.tsx`

**Changes Needed:**
```tsx
// Add import
import { PhoneInput } from "@/components/phone-input";

// Replace phone input field:
// OLD:
<Input
  id="phone"
  type="tel"
  value={formData.phone}
  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
/>

// NEW:
<PhoneInput
  value={formData.phone}
  onChange={(value) => setFormData({ ...formData, phone: value })}
  placeholder="Enter phone number"
/>

// Replace WhatsApp input field:
// OLD:
<Input
  id="whatsapp"
  type="tel"
  value={formData.whatsapp}
  onChange={(e) => setFormData({ ...formData, whatsapp: e.target.value })}
/>

// NEW:
<PhoneInput
  value={formData.whatsapp}
  onChange=(value) => setFormData({ ...formData, whatsapp: value })}
  placeholder="Enter WhatsApp number"
/>
```

---

### Step 2: Add Checkbox Selection to Table

**File:** `apps/admin/src/app/(dashboard)/clients/_components/clients-view.tsx`

**Add State:**
```tsx
const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

const handleSelectAll = (checked: boolean) => {
  if (checked) {
    setSelectedIds(new Set(filteredClients.map((c: any) => c.id)));
  } else {
    setSelectedIds(new Set());
  }
};

const handleSelectOne = (id: string, checked: boolean) => {
  const newSelected = new Set(selectedIds);
  if (checked) {
    newSelected.add(id);
  } else {
    newSelected.delete(id);
  }
  setSelectedIds(newSelected);
};
```

**Add Checkbox Column:**
```tsx
// In TableHeader:
<TableHead className="w-[50px]">
  <Checkbox
    checked={selectedIds.size === filteredClients.length && filteredClients.length > 0}
    onCheckedChange={handleSelectAll}
  />
</TableHead>

// In TableRow:
<TableCell onClick={(e) => e.stopPropagation()}>
  <Checkbox
    checked={selectedIds.has(client.id)}
    onCheckedChange={(checked) => handleSelectOne(client.id, checked as boolean)}
  />
</TableCell>
```

---

### Step 3: Add Bulk Actions

**Add Imports:**
```tsx
import { BulkActionsBar } from "@/components/bulk-actions-bar";
```

**Add Handlers:**
```tsx
const handleBulkDelete = async () => {
  if (!confirm(`Delete ${selectedIds.size} clients?`)) return;
  
  for (const id of selectedIds) {
    await deleteMutation.mutateAsync({ id });
  }
  
  setSelectedIds(new Set());
  toast.success(`Deleted ${selectedIds.size} clients`);
};

const handleBulkCopy = () => {
  const selected = filteredClients.filter((c: any) => selectedIds.has(c.id));
  const text = selected.map((c: any) => 
    `${c.name}\t${c.phone}\t${c.whatsapp}\t${c.email}`
  ).join('\n');
  
  navigator.clipboard.writeText(text);
  toast.success(`Copied ${selectedIds.size} clients`);
};

const handleBulkExport = () => {
  const selected = filteredClients.filter((c: any) => selectedIds.has(c.id));
  const csv = Papa.unparse(selected);
  const blob = new Blob([csv], { type: 'text/csv' });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `clients-export-${new Date().toISOString().split('T')[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
  
  toast.success(`Exported ${selectedIds.size} clients`);
};
```

**Add Component:**
```tsx
<BulkActionsBar
  selectedCount={selectedIds.size}
  onDelete={handleBulkDelete}
  onCopy={handleBulkCopy}
  onExport={handleBulkExport}
  onClear={() => setSelectedIds(new Set())}
/>
```

---

### Step 4: Implement Filter Functionality

**Add Imports:**
```tsx
import { FilterSheet, type FilterOptions } from "@/components/filter-sheet";
```

**Add State:**
```tsx
const [filterSheetOpen, setFilterSheetOpen] = useState(false);
const [activeFilters, setActiveFilters] = useState<FilterOptions>({});
```

**Update Filtered Clients:**
```tsx
const filteredClients = useMemo(() => {
  let result = clients;
  
  // Apply search
  if (search) {
    result = result.filter((c: any) =>
      c.name.toLowerCase().includes(search.toLowerCase()) ||
      c.email?.toLowerCase().includes(search.toLowerCase()) ||
      c.phone?.includes(search) ||
      c.whatsapp?.includes(search)
    );
  }
  
  // Apply tag filter
  if (tagFilter) {
    result = result.filter((c: any) => 
      c.tags?.includes(tagFilter)
    );
  }
  
  // Apply advanced filters
  if (activeFilters.referralSource) {
    result = result.filter((c: any) => 
      c.referralSource === activeFilters.referralSource
    );
  }
  
  if (activeFilters.hasOrders !== undefined) {
    result = result.filter((c: any) => 
      activeFilters.hasOrders ? c.ordersCount > 0 : c.ordersCount === 0
    );
  }
  
  if (activeFilters.minRevenue) {
    result = result.filter((c: any) => 
      Number(c.totalRevenue) >= activeFilters.minRevenue!
    );
  }
  
  if (activeFilters.maxRevenue) {
    result = result.filter((c: any) => 
      Number(c.totalRevenue) <= activeFilters.maxRevenue!
    );
  }
  
  return result;
}, [clients, search, tagFilter, activeFilters]);
```

**Update Filter Button:**
```tsx
<Button 
  variant="outline" 
  size="sm" 
  className="gap-2"
  onClick={() => setFilterSheetOpen(true)}
>
  <Filter className="h-4 w-4" /> 
  Filters
  {Object.keys(activeFilters).length > 0 && (
    <Badge variant="secondary" className="ml-1">
      {Object.keys(activeFilters).length}
    </Badge>
  )}
</Button>

<FilterSheet
  open={filterSheetOpen}
  onOpenChange={setFilterSheetOpen}
  onApplyFilters={setActiveFilters}
/>
```

---

### Step 5: Add CSV Upload/Download

**Add Import:**
```tsx
import { CSVUpload } from "@/components/csv-upload";
import Papa from "papaparse";
```

**Add Handler:**
```tsx
const handleCSVUpload = async (data: any[]) => {
  let successCount = 0;
  let errorCount = 0;
  
  for (const row of data) {
    try {
      await createMutation.mutateAsync({
        name: row.name,
        phone: row.phone || null,
        whatsapp: row.whatsapp,
        email: row.email || null,
        address: row.address || null,
        country: row.country || null,
        countryCode: row.countryCode || null,
        company: row.company || null,
        occupation: row.occupation || null,
        referral_source: row.referralSource || null,
        tags: row.tags ? row.tags.split(',').map((t: string) => t.trim()) : null,
        notes: row.notes || null,
      });
      successCount++;
    } catch (error) {
      errorCount++;
      console.error('Failed to import client:', row.name, error);
    }
  }
  
  if (successCount > 0) {
    toast.success(`Imported ${successCount} clients`);
  }
  if (errorCount > 0) {
    toast.error(`Failed to import ${errorCount} clients`);
  }
};
```

**Add Component:**
```tsx
<CSVUpload onUpload={handleCSVUpload} />
```

---

## 📊 CSV Template Format

**Template File:** `clients-template.csv`

```csv
name,phone,whatsapp,email,address,country,countryCode,company,occupation,referralSource,tags,notes
John Doe,+233241234567,+233241234567,john@example.com,"123 Main St, Accra",Ghana,GH,Acme Inc,Business Owner,Instagram,"VIP,Regular",Prefers kaftans
Jane Smith,+233251234567,+233251234567,jane@example.com,"456 Oak Ave, Kumasi",Ghana,GH,Tech Corp,Engineer,Facebook,Regular,Standard sizes
```

**Fields:**
- `name` (required)
- `phone` (optional, with country code)
- `whatsapp` (required, with country code)
- `email` (optional)
- `address` (optional)
- `country` (optional)
- `countryCode` (optional, e.g., GH, US, UK)
- `company` (optional)
- `occupation` (optional)
- `referralSource` (optional)
- `tags` (optional, comma-separated)
- `notes` (optional)

---

## 🎨 UI Layout Changes

### Toolbar Layout (After Changes):
```
┌────────────────────────────────────────────────────────────┐
│ [Search...] [Columns] [Filters 2] [Import CSV] [Template] │
│                                         [+ Add Client]     │
└────────────────────────────────────────────────────────────┘
```

### Table with Checkboxes:
```
┌──────────────────────────────────────────────────────────┐
│ [✓] Name  | Phone        | WhatsApp     | Orders | ...  │
│ [ ] John  | +233 24 ... | +233 24 ...  | 5      | ...  │
│ [✓] Jane  | +233 25 ... | +233 25 ...  | 3      | ...  │
└──────────────────────────────────────────────────────────┘
```

### Bulk Actions Bar (Bottom):
```
                 ┌──────────────────────────────────┐
                 │ 2 selected | Delete Copy Export × │
                 └──────────────────────────────────┘
```

---

## 🔐 Security Considerations

**CSV Upload:**
- Validate required fields (name, whatsapp)
- Sanitize input data
- Limit file size (< 5MB)
- Only accept .csv files
- Handle parsing errors gracefully

**Bulk Delete:**
- Require confirmation
- Show count before deleting
- Handle failures gracefully
- Log deleted items (audit trail)

**Phone Numbers:**
- Validate format with country code
- Store in E.164 format (+233241234567)
- Display with formatting

---

## 🧪 Testing Checklist

### Phone Input:
- [  ] Phone accepts international format
- [  ] WhatsApp accepts international format
- [  ] Country selector works
- [  ] Invalid numbers rejected
- [  ] Displays with proper formatting

### Checkboxes:
- [  ] Select all works
- [  ] Individual selection works
- [  ] Selection persists during scroll
- [  ] Deselect all works
- [  ] Checkbox column sticky (doesn't scroll)

### Bulk Actions:
- [  ] Delete confirmation shows
- [  ] Delete removes selected clients
- [  ] Copy copies to clipboard
- [  ] Export downloads CSV
- [  ] Clear removes selection
- [  ] Bar auto-hides when empty

### Filters:
- [  ] Filter sheet opens
- [  ] Each filter applies correctly
- [  ] Multiple filters work together
- [  ] Clear all resets filters
- [  ] Badge shows filter count
- [  ] Filtered clients correct

### CSV Upload:
- [  ] Template downloads correctly
- [  ] Upload accepts CSV
- [  ] Rejects non-CSV files
- [  ] Parses data correctly
- [  ] Validates required fields
- [  ] Shows success/error messages
- [  ] Imports to database

---

## 📦 Required Packages (Already Installed)

✅ `react-phone-number-input` - Phone input with country codes
✅ `papaparse` - CSV parsing
✅ `@types/papaparse` - TypeScript types

---

## 🎯 Next Steps

1. **Update client-sheet.tsx** - Replace phone inputs with PhoneInput component
2. **Update clients-view.tsx** - Add checkbox column, bulk actions, filter, CSV upload
3. **Test each feature** - Follow testing checklist
4. **Update database migration** - If phone format changes needed

---

**Ready to implement?** Say "yes" and I'll update the files!

This is a comprehensive update touching multiple files. Want me to implement step by step or all at once?
