# React Performance: Freezing Issues & Prevention Guide

## Overview
This document outlines the root causes of React component freezing issues encountered in the transactions pages and provides guidelines to prevent similar problems in the future.

## Root Causes of Freezing

### 1. Infinite Re-render Loops

**Problem**: Components re-render infinitely, causing the browser to freeze.

**Common Causes**:

#### A. Missing Dependencies in useMemo/useCallback
```typescript
// ❌ WRONG - Missing dependencies causes infinite re-renders
const columns = useMemo(() => {
  return createTransactionColumns({
    currencyCode,
    onToggleSelection: (id: string) => {
      // This function uses bulkUpdate, bulkDelete, toast, openParams
      // but they're not in the dependency array
    },
  });
}, [currencyCode]); // Missing: bulkUpdate, bulkDelete, toast, openParams

// ✅ CORRECT - All dependencies included
const columns = useMemo(() => {
  return createTransactionColumns({
    currencyCode,
    onToggleSelection: (id: string) => {
      // Function implementation
    },
  });
}, [currencyCode, bulkUpdate, bulkDelete, toast, openParams]);
```

#### B. useEffect with State in Dependencies
```typescript
// ❌ WRONG - Creates infinite loop
useEffect(() => {
  const selectedIds = new Set(/* ... */);
  setSelected(selectedIds); // Updates selected state
}, [rowSelection, table, selected]); // selected is in dependencies!

// ✅ CORRECT - Remove state from dependencies
useEffect(() => {
  const selectedIds = new Set(/* ... */);
  setSelected(selectedIds);
}, [rowSelection, table]); // selected removed
```

#### C. Unstable Function References
```typescript
// ❌ WRONG - Function recreated on every render
const open = (options) => {
  setParams({ type: "create", ...options });
};

// ✅ CORRECT - Memoized function
const open = useCallback((options) => {
  setParams({ type: "create", ...options });
}, [setParams]);
```

### 2. Performance-Degrading Patterns

#### A. Console.log in Render Cycles
```typescript
// ❌ WRONG - Console.log in render degrades performance
export function Component() {
  console.log('[RENDER] Component rendering'); // Called on every render
  return <div>...</div>;
}

// ✅ CORRECT - Remove or use conditional logging
export function Component() {
  // No console.log in render cycles
  return <div>...</div>;
}
```

#### B. Expensive Computations Without Memoization
```typescript
// ❌ WRONG - Map recreated on every render
const byId = new Map(transactions.map(r => [r.id, r]));

// ✅ CORRECT - Memoized computation
const byId = useMemo(() => 
  new Map(transactions.map(r => [r.id, r])), 
  [transactions]
);
```

#### C. Complex Object Creation in useMemo
```typescript
// ❌ WRONG - Complex object recreated unnecessarily
const enrichedInput = useMemo(() => {
  return {
    type: filterType === "all" ? undefined : filterType,
    status: statuses.length ? statuses : undefined,
    // ... many more properties
  };
}, [filterType, statuses, categories, tags, accounts, search, startDate, endDate, hasAttachments, amountMin, amountMax]);

// ✅ CORRECT - Only recreate when necessary
const enrichedInput = useMemo(() => {
  const input = {};
  if (filterType !== "all") input.type = filterType;
  if (statuses.length) input.status = statuses;
  // ... only set properties that have values
  return input;
}, [filterType, statuses, categories, tags, accounts, search, startDate, endDate, hasAttachments, amountMin, amountMax]);
```

### 3. Suspense Query Issues

#### A. useSuspenseInfiniteQuery Problems
```typescript
// ❌ PROBLEMATIC - Can cause re-render loops
const [pages, { fetchNextPage }] = trpc.data.useSuspenseInfiniteQuery(
  input, // If input changes frequently, causes issues
  { getNextPageParam: (last) => last?.nextCursor ?? null }
);

// ✅ BETTER - Use regular query for debugging
const { data } = trpc.data.useQuery(input, {
  initialData: initialData,
});
```

#### B. Multiple useSuspenseQuery Calls
```typescript
// ❌ PROBLEMATIC - Multiple suspense queries can conflict
const [data1] = trpc.query1.useSuspenseQuery();
const [data2] = trpc.query2.useSuspenseQuery();
const [data3] = trpc.query3.useSuspenseQuery();

// ✅ BETTER - Use regular queries with initialData
const { data: data1 } = trpc.query1.useQuery(undefined, { initialData: initialData1 });
const { data: data2 } = trpc.query2.useQuery(undefined, { initialData: initialData2 });
const { data: data3 } = trpc.query3.useQuery(undefined, { initialData: initialData3 });
```

## Prevention Guidelines

### 1. Always Include All Dependencies

**Rule**: Every value used inside useMemo, useCallback, or useEffect must be in the dependency array.

```typescript
// Checklist for dependencies:
// ✅ All state variables used
// ✅ All props used  
// ✅ All functions called
// ✅ All variables from hooks used
// ✅ All computed values used
```

### 2. Memoize Expensive Operations

```typescript
// ✅ Memoize expensive computations
const expensiveValue = useMemo(() => {
  return heavyComputation(data);
}, [data]);

// ✅ Memoize callback functions
const handleClick = useCallback((id: string) => {
  onItemClick(id);
}, [onItemClick]);
```

### 3. Avoid State in useEffect Dependencies

```typescript
// ❌ NEVER put state setters in dependencies
useEffect(() => {
  setState(newValue);
}, [state, setState]); // setState causes infinite loop

// ✅ Only include values that trigger the effect
useEffect(() => {
  setState(newValue);
}, [triggerValue]); // Only triggerValue
```

### 4. Use Stable References

```typescript
// ✅ Use useCallback for functions passed to children
const handleAction = useCallback((id: string) => {
  performAction(id);
}, [performAction]);

// ✅ Use useMemo for objects passed to children
const config = useMemo(() => ({
  option1: value1,
  option2: value2,
}), [value1, value2]);
```

### 5. Debug Performance Issues

```typescript
// ✅ Add temporary logging to identify re-render causes
const Component = () => {
  console.log('[DEBUG] Component render', { 
    prop1, 
    state1, 
    memoizedValue 
  });
  
  const memoizedValue = useMemo(() => {
    console.log('[DEBUG] useMemo executing');
    return expensiveComputation();
  }, [dependency]);
  
  return <div>...</div>;
};
```

### 6. Query Optimization

```typescript
// ✅ Use regular queries with initialData for better control
const { data, isLoading } = trpc.data.useQuery(
  params,
  {
    initialData: serverData, // Prevents loading states
    staleTime: 30000, // Prevents unnecessary refetches
  }
);

// ✅ Avoid useSuspenseQuery unless absolutely necessary
// Regular queries give you more control over loading states
```

## Common Anti-Patterns to Avoid

### ❌ Don't Do These:

1. **Missing dependencies in hooks**
2. **Console.log in render cycles**
3. **Creating objects/arrays in render without memoization**
4. **Putting state setters in useEffect dependencies**
5. **Using useSuspenseQuery without understanding the implications**
6. **Creating functions in render without useCallback**
7. **Complex computations without useMemo**
8. **Intersection observers without proper cleanup**
9. **Multiple state updates in rapid succession**
10. **Accessing DOM directly in render**

### ✅ Do These Instead:

1. **Always include all dependencies**
2. **Remove console.log from production renders**
3. **Memoize expensive computations**
4. **Use useCallback for event handlers**
5. **Use regular queries with initialData**
6. **Clean up effects properly**
7. **Batch state updates**
8. **Use refs for DOM access**
9. **Profile performance with React DevTools**
10. **Test with realistic data volumes**

## Debugging Checklist

When a component is freezing:

1. **Check for infinite loops**:
   - Look for useEffect with state in dependencies
   - Check useMemo/useCallback dependencies
   - Verify function references are stable

2. **Profile performance**:
   - Use React DevTools Profiler
   - Check for excessive re-renders
   - Look for expensive computations

3. **Simplify queries**:
   - Replace useSuspenseQuery with useQuery
   - Use initialData to prevent loading states
   - Remove infinite scroll temporarily

4. **Add debugging**:
   - Temporary console.log to track renders
   - Check dependency arrays
   - Verify memoization is working

## Tools for Prevention

1. **ESLint Rules**:
   - `react-hooks/exhaustive-deps`
   - `react-hooks/rules-of-hooks`

2. **React DevTools**:
   - Profiler tab for performance analysis
   - Components tab for re-render tracking

3. **TypeScript**:
   - Strict mode for better type checking
   - Proper typing for hook dependencies

## Conclusion

Most React freezing issues stem from infinite re-render loops caused by:
- Missing dependencies in hooks
- State in useEffect dependencies  
- Unstable function references
- Performance-degrading patterns

Following these guidelines and using proper debugging techniques will prevent similar issues in the future.
