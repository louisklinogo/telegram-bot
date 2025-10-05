# Nia Timeout Workarounds & Best Practices

**Problem:** Complex semantic queries to Nia often timeout (>30-60s)  
**Solution:** Use focused queries and direct file reads

---

## Understanding the Issue

**Why Timeouts Happen:**
- Complex queries analyze 10+ files simultaneously
- Semantic processing is computationally expensive
- Network latency to Nia's cloud API
- Default MCP timeout is ~30-60 seconds

**Queries That Typically Timeout:**
- ❌ "Explain complete architecture..."
- ❌ "Analyze entire authentication flow..."
- ❌ "Show all patterns used in..."
- ❌ Multiple concepts in one query
- ❌ Requests for "comprehensive" explanations

---

## Workaround Strategies

### Strategy 1: Use Direct File Reads (Fastest)

**When you know the file path, read directly:**

```typescript
// ✅ BEST - No timeout, instant results
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})

// ✅ Read multiple files in parallel
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/client.tsx"
})
```

**How to find file paths:**
1. Use `get_repository_hierarchy` to explore structure
2. Use Ref to search for file names
3. Use Grep in local midday-assistant-v2 folder

### Strategy 2: Break Complex Queries into Steps

**Instead of one big query:**
```typescript
❌ "Explain Midday's complete frontend architecture: Server Components, 
   Client Components, tRPC integration, routing, and state management. 
   Show how pages, layouts, and components are organized."
```

**Break into focused queries:**
```typescript
// Step 1: Core setup
✅ "Show Midday's HydrateClient implementation"
// Wait for response

// Step 2: Server setup
✅ "Show Midday's tRPC server setup with getQueryClient"
// Wait for response

// Step 3: Example usage
✅ "Show example Server Component using tRPC prefetch"
// Wait for response

// Step 4: Client pattern
✅ "Show example Client Component with useSuspenseQuery"
// Wait for response
```

### Strategy 3: Use Repository Hierarchy First

**Get structure before querying:**

```typescript
// ✅ Fast - No semantic processing
nia___get_repository_hierarchy({
  repository: "Fluxitude/midday",
  include_classes: true,
  include_methods: false
})

// Now you know where files are, use direct reads
```

### Strategy 4: Target Specific Concepts

**Avoid broad questions:**

```typescript
❌ "How does Midday implement authentication?"
// Too broad - could analyze 20+ files

✅ "Show Midday's auth middleware in tRPC init.ts"
// Specific file + concept
```

### Strategy 5: Use Ref for Quick Lookups

**When you just need to find files:**

```typescript
// ✅ Fast keyword search
ref___ref_search_documentation({
  query: "ref_src=private HydrateClient"
})
// Returns file list quickly

// Then use Nia to read specific files
```

---

## Practical Workflow Examples

### Example 1: Understanding tRPC Setup

**❌ Timeout-Prone Approach:**
```typescript
nia___search_codebase({
  query: "Explain Midday's complete tRPC setup including server-side proxy, 
         client provider, query client configuration, prefetch helpers, 
         and integration with Server Components",
  repositories: ["Fluxitude/midday"]
})
// ⏱️ Will timeout
```

**✅ Efficient Approach:**
```typescript
// Step 1: Read server file
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})
// ✅ 3-5 seconds

// Step 2: Read client file
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/client.tsx"
})
// ✅ 3-5 seconds

// Step 3: Read query client config
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/query-client.ts"
})
// ✅ 3-5 seconds

// Step 4: Now ask focused question
nia___search_codebase({
  query: "How does HydrateClient integrate with Server Components?",
  repositories: ["Fluxitude/midday"]
})
// ✅ Likely succeeds - focused query
```

### Example 2: Understanding Authentication

**❌ Timeout-Prone:**
```typescript
nia___search_codebase({
  query: "Trace entire authentication flow from login to tRPC context",
  repositories: ["Fluxitude/midday"]
})
// ⏱️ Will timeout
```

**✅ Efficient:**
```typescript
// Step 1: Find auth middleware
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/api/src/trpc/init.ts"
})

// Step 2: Focused question
nia___search_codebase({
  query: "Show auth middleware extracting session",
  repositories: ["Fluxitude/midday"]
})

// Step 3: Another focused question
nia___search_codebase({
  query: "Show teamProcedure context setup",
  repositories: ["Fluxitude/midday"]
})
```

### Example 3: Schema Analysis

**❌ Timeout-Prone:**
```typescript
nia___search_codebase({
  query: "Analyze Midday's complete database schema with all tables, 
         relationships, RLS policies, indexes, and design patterns",
  repositories: ["Fluxitude/midday"]
})
// ⏱️ Will timeout
```

**✅ Efficient:**
```typescript
// Step 1: Read schema file directly
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:packages/db/src/schema.ts"
})

// Step 2: Focused questions
nia___search_codebase({
  query: "Show Midday's pgEnum definitions",
  repositories: ["Fluxitude/midday"]
})

nia___search_codebase({
  query: "Show example RLS policy in Midday",
  repositories: ["Fluxitude/midday"]
})
```

---

## Best Practices Summary

### ✅ DO:

1. **Use `read_source_content` when you know the file path**
   - Fastest method
   - No timeout risk
   - Gets exact file

2. **Query one concept at a time**
   - "Show HydrateClient"
   - NOT "Explain entire frontend architecture"

3. **Use `get_repository_hierarchy` to explore structure**
   - See all files and folders
   - Plan your queries

4. **Wait for responses**
   - Don't chain complex queries
   - Process results before next query

5. **Be specific about files**
   - "in server.tsx"
   - "in init.ts"
   - "in schema.ts"

### ❌ DON'T:

1. **Don't ask for "complete" or "comprehensive"**
   - Triggers analysis of many files
   - High timeout risk

2. **Don't combine multiple concepts**
   - "Show A, B, and C" → timeout
   - Ask for A, then B, then C

3. **Don't use vague queries**
   - "How does authentication work?" → too broad
   - "Show auth middleware in init.ts" → specific

4. **Don't retry the same complex query**
   - If it timed out once, it will again
   - Break it down first

5. **Don't ignore the hierarchy tool**
   - Helps you find exact file paths
   - Enables direct reads

---

## Query Complexity Scale

**🟢 Low Complexity (Fast, No Timeout):**
- Direct file reads
- Repository hierarchy
- Single file focused queries
- Specific function/class lookups

**🟡 Medium Complexity (Usually OK):**
- Single concept queries
- File-specific questions
- Pattern searches with context
- 2-3 related files

**🔴 High Complexity (Likely Timeout):**
- "Complete" or "entire" system questions
- 5+ concepts in one query
- Cross-cutting concerns without file context
- "Trace flow" across multiple files

---

## Timeout Recovery Checklist

When a query times out:

- [ ] Was it asking for multiple concepts? → Break into separate queries
- [ ] Did it use "complete" or "comprehensive"? → Remove and focus
- [ ] Can I read specific files instead? → Use `read_source_content`
- [ ] Do I know the file path? → Use direct read
- [ ] Should I explore structure first? → Use `get_repository_hierarchy`
- [ ] Can Ref find the files quickly? → Use Ref, then Nia to read

---

## Real-World Example: System Overhaul Analysis

**What We Did (Worked):**
```typescript
// 1. Got database schema (fast)
supabase___list_tables()

// 2. Read known important files
ref___ref_read_url({
  url: "https://github.com/Fluxitude/midday/.../server.tsx"
})

// 3. Used previous analysis docs
Read("docs/architectural-analysis.md")

// 4. Targeted Nia queries
nia___search_codebase({
  query: "HydrateClient tRPC setup",  // Simple, focused
  repositories: ["Fluxitude/midday"]
})
```

**What Would Have Timed Out:**
```typescript
❌ nia___search_codebase({
  query: "Explain Midday's complete frontend architecture: Server Components, 
         Client Components, tRPC integration, routing, and state management",
  repositories: ["Fluxitude/midday"]
})

❌ nia___search_codebase({
  query: "Explain Midday's API architecture: Hono setup, tRPC routers, 
         middleware, authentication flow, and integration patterns",
  repositories: ["Fluxitude/midday"]
})
```

---

## Tool Selection Matrix

| Goal | Best Tool | Why |
|------|-----------|-----|
| Read known file | `read_source_content` | Fastest, no timeout |
| Find file location | Ref search → `get_hierarchy` | Quick keyword match |
| Understand pattern | Focused Nia query | Semantic understanding |
| Compare approaches | Multiple focused queries | Break down comparison |
| Explore structure | `get_repository_hierarchy` | See all at once |
| Get code examples | `read_source_content` + focused search | Precise targeting |

---

**Remember:** Nia is powerful for semantic understanding, but works best with focused, specific queries. When in doubt, break it down! 🎯
