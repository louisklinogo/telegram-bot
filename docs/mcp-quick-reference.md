# MCP Tools Quick Reference Guide

**Purpose:** Fast reference for Nia & Ref usage during development

---

## Nia MCP - AI Codebase Analysis

### When to Use
- ✅ Understanding architecture & patterns
- ✅ Learning from reference codebases
- ✅ "How does X work?" questions
- ✅ Implementation guidance

### Core Commands

**1. Search Codebase (Semantic)**
```typescript
// Best for: Understanding patterns, finding related code
nia___search_codebase({
  query: "How does tRPC server-side hydration work with HydrateClient?",
  repositories: ["Fluxitude/midday"]
})

// Returns: Comprehensive explanation with code snippets
```

**2. Read Full Source File**
```typescript
// Best for: Getting complete file content
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})

// Returns: Full file with syntax highlighting
```

**3. List/Check Resources**
```typescript
// Check what's indexed
nia___list_resources()

// Check indexing status
nia___check_resource_status({
  resource_type: "repository",
  identifier: "Fluxitude/midday"
})
```

**4. Get Repository Structure**
```typescript
// Best for: Understanding project layout
nia___get_repository_hierarchy({
  repository: "Fluxitude/midday",
  include_classes: true,
  include_methods: false
})
```

### Query Tips
- ✅ **Use natural language**: "Explain the authentication flow"
- ✅ **Be specific about context**: "In Midday's tRPC setup..."
- ✅ **Ask for comparisons**: "Compare Midday's pattern with..."
- ✅ **KEEP QUERIES FOCUSED**: One concept per query to avoid timeouts
- ❌ **Don't use just keywords**: Use full questions instead
- ❌ **Don't ask for "complete" or "comprehensive"**: Break into smaller queries

### Avoiding Timeouts ⚠️

**Complex queries that may timeout:**
```typescript
❌ "Explain Midday's complete frontend architecture: Server Components, 
   Client Components, tRPC integration, routing, and state management"
   
❌ "Analyze entire authentication flow from middleware to database"

❌ "Show all patterns used in Midday dashboard with examples"
```

**Better: Break into smaller queries**
```typescript
✅ "Show Midday's HydrateClient implementation"
// Wait for response, then:

✅ "Show Midday's tRPC server setup with getQueryClient"
// Wait for response, then:

✅ "Show example Server Component using tRPC prefetch"
```

**Best: Use direct file reads when you know the path**
```typescript
✅ nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})
// Faster, no timeouts
```

---

## Ref MCP - Documentation Search

### When to Use
- ✅ Finding specific files quickly
- ✅ API documentation lookups
- ✅ Keyword-based searches
- ✅ Official framework docs

### Core Commands

**1. Search Documentation**
```typescript
// Public docs (Next.js, React, etc.)
ref___ref_search_documentation({
  query: "Next.js Server Components data fetching"
})

// Your private indexed docs
ref___ref_search_documentation({
  query: "ref_src=private tRPC authentication patterns"
})

// Returns: List of matching files with URLs
```

**2. Read Documentation URL**
```typescript
// Best for: Getting full page content
ref___ref_read_url({
  url: "https://nextjs.org/docs/app/building-your-application/data-fetching"
})

// Returns: Full markdown content
```

### Query Tips
- ✅ **Use keywords**: "tRPC server hydration"
- ✅ **Add ref_src=private** for your indexed repos
- ✅ **Combine terms**: "Next.js 15 Server Components"
- ❌ **Don't ask questions**: Use keywords, not sentences

---

## Workflow Patterns

### Pattern 1: Learning from Midday
```typescript
// Step 1: Understand with Nia
nia___search_codebase({
  query: "Explain Midday's tRPC server setup with prefetching and hydration",
  repositories: ["Fluxitude/midday"]
})
// → Get comprehensive explanation + code

// Step 2: Read full file if needed
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})
// → Get complete implementation
```

### Pattern 2: Official Docs Reference
```typescript
// Quick API lookup with Ref
ref___ref_search_documentation({
  query: "tRPC createTRPCOptionsProxy API"
})
// → Fast file list

ref___ref_read_url({
  url: "[URL from search results]"
})
// → Full documentation
```

### Pattern 3: Implementing a Pattern
```typescript
// 1. Understand (Nia)
nia___search_codebase({
  query: "How does Midday implement Server Components with tRPC prefetching?",
  repositories: ["Fluxitude/midday"]
})

// 2. Reference (Ref - if needed)
ref___ref_search_documentation({
  query: "Next.js 15 cache() function usage"
})

// 3. Get specific files (Nia)
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/app/[locale]/(app)/(sidebar)/customers/page.tsx"
})
```

### Pattern 4: Troubleshooting
```typescript
// 1. Understand the issue (Nia)
nia___search_codebase({
  query: "How does Midday handle hydration mismatches with tRPC?",
  repositories: ["Fluxitude/midday"]
})

// 2. Check official solutions (Ref)
ref___ref_search_documentation({
  query: "React hydration mismatch solutions"
})
```

---

## Quick Decision Matrix

| Need | Use | Example Query |
|------|-----|---------------|
| Learn a pattern | Nia | "Explain Midday's authentication flow" |
| Find specific file | Ref | "ref_src=private HydrateClient component" |
| Understand architecture | Nia | "How do all tRPC pieces connect in Midday?" |
| API documentation | Ref | "tRPC httpBatchLink options" |
| Code examples | Nia | "Show me Midday's mutation pattern" |
| Quick lookup | Ref | "Next.js cache function" |
| Compare approaches | Nia | "Compare Midday vs our tRPC setup" |

---

## Resource Management

### Indexed in Nia
- ✅ **Fluxitude/midday** (main) - Status: indexed

### Indexed in Ref
- ✅ **Fluxitude/midday** (GitHub docs)
- ✅ Public documentation (Next.js, React, etc.)

---

## Common Queries for Our Project

### Architecture Analysis
```typescript
// Understand Midday's structure
nia___search_codebase({
  query: "Explain Midday's monorepo structure: apps vs packages organization",
  repositories: ["Fluxitude/midday"]
})

// Compare with our structure
nia___search_codebase({
  query: "How does Midday organize database queries and tRPC routers?",
  repositories: ["Fluxitude/midday"]
})
```

### Implementation Patterns
```typescript
// Server Components pattern
nia___search_codebase({
  query: "Show Midday's complete Server Component pattern with tRPC prefetch and HydrateClient",
  repositories: ["Fluxitude/midday"]
})

// Mutation pattern
nia___search_codebase({
  query: "How does Midday handle tRPC mutations with optimistic updates?",
  repositories: ["Fluxitude/midday"]
})

// Authentication
nia___search_codebase({
  query: "Trace Midday's authentication flow from middleware to tRPC context",
  repositories: ["Fluxitude/midday"]
})
```

### Specific Files
```typescript
// Get exact implementation
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/server.tsx"
})

nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/dashboard/src/trpc/client.tsx"
})

nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:apps/api/src/trpc/init.ts"
})
```

---

## Performance Tips

### Nia
- ⚡ **First query:** ~5-10s (semantic processing)
- ⚡ **Read source:** ~3-5s
- 💡 **Tip:** Ask comprehensive questions to get everything at once

### Ref
- ⚡ **Search:** ~2-3s
- ⚡ **Read URL:** ~2-5s (can timeout on large pages)
- 💡 **Tip:** Use precise keywords for faster results

---

## Limitations

### Nia
- ⚠️ Can timeout on very complex queries (retry with simpler query)
- ⚠️ 3 free repository indexes (Midday uses 1)
- ⚠️ Requires good natural language queries

### Ref
- ⚠️ Less context in results (need to read files)
- ⚠️ Keyword-based (doesn't understand intent)
- ⚠️ Read URL can timeout on slow servers

---

## Troubleshooting

### If Nia times out:
1. **Break query into smaller parts** - Ask for one thing at a time
2. **Use direct file reads** - If you know the file path, use `read_source_content`
3. **Be more specific** - Target specific files/components, not entire systems
4. **Avoid "complete" or "comprehensive"** - These trigger analysis of many files
5. **Try sequential queries** - Ask → wait → ask next, don't combine

**Example Recovery:**
```typescript
// Timed out on this:
❌ "Explain complete architecture"

// Retry with these instead:
✅ "Show HydrateClient component"
✅ "Show tRPC server setup"  
✅ "Show example page using pattern"
```

### If Ref times out on read:
1. Note the URL for manual reading
2. Try searching for alternative sources
3. Use Nia to read the same file from repo

---

## Best Practices

### For Nia
1. ✅ Ask complete questions with context
2. ✅ Specify "in Midday" for better targeting
3. ✅ Request code examples explicitly
4. ✅ Follow up with specific file reads if needed

### For Ref
1. ✅ Use `ref_src=private` for your indexed repos
2. ✅ Keep queries to 2-4 keywords
3. ✅ Check multiple results for best match
4. ✅ Read URLs for complete documentation

---

## Ready-to-Use Templates

### Architectural Deep Dive
```typescript
nia___search_codebase({
  query: `
    Analyze Midday's [FEATURE] architecture:
    1. How are components organized?
    2. What's the data flow?
    3. How does it integrate with tRPC?
    4. Show code examples
  `.trim(),
  repositories: ["Fluxitude/midday"]
})
```

### Pattern Implementation
```typescript
nia___search_codebase({
  query: `
    Show me Midday's complete implementation of [PATTERN]:
    - Core files involved
    - Code examples with context
    - Usage in actual pages
    - Integration with other systems
  `.trim(),
  repositories: ["Fluxitude/midday"]
})
```

### Quick File Access
```typescript
nia___read_source_content({
  source_type: "repository",
  source_identifier: "Fluxitude/midday:[FILE_PATH]"
})
```

---

**Remember:**
- **Nia** = Understanding & Learning (use for architectural analysis)
- **Ref** = Quick Reference & Lookups (use for API docs)
- **Both** = Power combo for implementation

This guide is optimized for rapid execution during development sessions.
