# Cache Invalidation Fix 🔧

## 🐛 The Problem

**Symptom:** Creating a new client saves to Supabase but the table doesn't update until page refresh.

**Root Cause:** Query cache invalidation mismatch.

---

## 🔍 What Was Wrong

### The Query (in `clients-view.tsx`):
```tsx
const { data } = useSuspenseInfiniteQuery({
  queryKey: ["clients.list", { search: search || undefined }],
  // ↑ Custom query key
  queryFn: async ({ pageParam }) => {
    const result = await utils.client.clients.list.query({...});
    return result;
  },
});
```

### The Mutation (in `use-client-mutations.ts`):
```tsx
const m = trpc.clients.create.useMutation({
  onSuccess: async () => {
    await utils.clients.list.invalidate();
    // ↑ Only invalidates tRPC's internal cache
    // ❌ Doesn't invalidate the custom query key!
  },
});
```

**The Mismatch:**
- Query uses: `["clients.list", {...}]` (custom key)
- Invalidation targets: tRPC internal cache only
- Result: React Query cache not invalidated → No refetch → Table doesn't update

---

## ✅ The Fix

### Updated Mutations:
```tsx
import { useQueryClient } from "@tanstack/react-query";

export function useCreateClient() {
  const utils = trpc.useUtils();
  const queryClient = useQueryClient(); // ← Added this
  
  const m = trpc.clients.create.useMutation({
    onSuccess: async () => {
      // Invalidate tRPC cache
      await utils.clients.list.invalidate();
      
      // Invalidate custom query key ← This was missing!
      await queryClient.invalidateQueries({ 
        queryKey: ["clients.list"] 
      });
      
      toast.success("Client created successfully");
    },
  });
}
```

### Also Updated Query:
```tsx
const { data, refetch } = useSuspenseInfiniteQuery({
  queryKey: ["clients.list", { search: search || undefined }],
  queryFn: async ({ pageParam }) => {...},
  staleTime: 0,           // ← Always consider data stale
  refetchOnMount: true,   // ← Refetch when component mounts
});
```

---

## 🎯 Why This Works

### Double Invalidation Strategy:

1. **`utils.clients.list.invalidate()`**
   - Invalidates tRPC's internal React Query cache
   - Ensures tRPC queries update

2. **`queryClient.invalidateQueries({ queryKey: ["clients.list"] })`**
   - Invalidates ALL queries matching `"clients.list"` prefix
   - Catches our custom query key: `["clients.list", { search: ... }]`
   - Forces React Query to refetch

### Query Settings:

3. **`staleTime: 0`**
   - Data is immediately considered stale
   - Next access triggers refetch

4. **`refetchOnMount: true`**
   - Component remount forces refetch
   - Ensures fresh data after mutations

---

## 🧪 Test It

### Test 1: Create Client
1. Click "Add Client"
2. Fill form and save
3. **Expected:** Table updates immediately ✅
4. **Before Fix:** Required page refresh ❌

### Test 2: Edit Client
1. Click any row to edit
2. Change name/tags
3. Click "Update"
4. **Expected:** Changes appear instantly ✅

### Test 3: Delete Client
1. Click actions menu (≡)
2. Click "Delete"
3. **Expected:** Row disappears immediately ✅

---

## 📊 Cache Flow Diagram

### Before Fix:
```
Create Client
    ↓
Save to Supabase ✅
    ↓
Invalidate tRPC cache ✅
    ↓
Custom query key NOT invalidated ❌
    ↓
React Query thinks data is fresh ❌
    ↓
No refetch ❌
    ↓
Table doesn't update ❌
```

### After Fix:
```
Create Client
    ↓
Save to Supabase ✅
    ↓
Invalidate tRPC cache ✅
    ↓
Invalidate custom query key ✅
    ↓
React Query marks data as stale ✅
    ↓
Auto refetch triggered ✅
    ↓
Table updates immediately ✅
```

---

## 🔑 Key Takeaways

1. **Always match query keys** between queries and invalidations
2. **Use both invalidation methods** when using custom query keys with tRPC
3. **Set `staleTime: 0`** for data that updates frequently
4. **Enable `refetchOnMount`** for critical real-time data

---

## 🚀 Applied To

All three mutations now use this pattern:
- ✅ `useCreateClient()` - Create new client
- ✅ `useUpdateClient()` - Edit existing client
- ✅ `useDeleteClient()` - Delete client

**Files Modified:**
- `apps/admin/src/hooks/use-client-mutations.ts`
- `apps/admin/src/app/(dashboard)/clients/_components/clients-view.tsx`

---

**The table should now update immediately after any mutation!** 🎉
