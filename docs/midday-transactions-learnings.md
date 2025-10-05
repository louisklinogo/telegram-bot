# Learnings from Fluxitude/midday Transactions Schema

The transactions schema in the Fluxitude/midday codebase provides a robust pattern for financial data management, particularly suitable for a multi-tenant SaaS application.

## Key Design Principles to Adopt:

### 1. Multi-Tenancy Scoping (CRITICAL)
*   **Column:** `teamId: uuid("team_id").notNull()`
*   **Learning:** Ensure every record is strictly scoped by a `teamId` to enforce multi-tenancy and data isolation.

### 2. Full-Text Search (FTS)
*   **Column:** `ftsVector: tsvector("fts_vector").notNull().generatedAlwaysAs(...)`
*   **Learning:** Utilize a generated `tsvector` column (PostgreSQL specific) for highly efficient full-text search across relevant text fields (`name`, `description`). This offloads the FTS processing to the database.

### 3. Financial Precision and Type Safety
*   **Column:** `amount: numericCasted({ precision: 10, scale: 2 }).notNull()`
*   **Learning:** Use a decimal or numeric type with explicit precision and scale to prevent floating-point errors (e.g., `10, 2` for 10 total digits, 2 after the decimal).

### 4. Multi-Currency Support
*   **Columns:** `currency: text().notNull()`, `baseAmount: numericCasted({ ... })`, `baseCurrency: text()`
*   **Learning:** Store the original transaction currency and amount, along with the converted amount and currency for the team's base currency. This is essential for reporting and consistency.

### 5. Categorization and Enrichment
*   **Columns:** `categorySlug: text("category_slug")`, `enrichmentCompleted: boolean("enrichment_completed").default(false)`
*   **Learning:** Include fields to track automated categorization (slug) and a flag to manage the state of external data enrichment, which is useful for background processing.

### 6. Source and Status Tracking
*   **Columns:** `manual: boolean().default(false)`, `status: transactionStatusEnum().default("posted")`
*   **Learning:** Track if the transaction was entered manually by a user or imported from a bank/external source. Use an enum for the transaction status (e.g., `posted`, `pending`).

## Schema Snippet (Drizzle ORM):

```typescript
export const transactions = pgTable(
  "transactions",
  {
    // ...
    amount: numericCasted({ precision: 10, scale: 2 }).notNull(),
    currency: text().notNull(),
    teamId: uuid("team_id").notNull(),
    // ... other columns
    bankAccountId: uuid("bank_account_id"),
    internalId: text("internal_id").notNull(),
    status: transactionStatusEnum().default("posted"),
    balance: numericCasted({ precision: 10, scale: 2 }),
    manual: boolean().default(false),
    description: text(),
    categorySlug: text("category_slug"),
    baseAmount: numericCasted({ precision: 10, scale: 2 }),
    counterpartyName: text("counterparty_name"),
    baseCurrency: text("base_currency"),
    // ...
    enrichmentCompleted: boolean("enrichment_completed").default(false),
    ftsVector: tsvector("fts_vector")
      .notNull()
      .generatedAlwaysAs(() => 
        // SQL for full-text search generation
      ),
  }
);
```

## API/Validation Pattern (Zod):

The codebase uses Zod for strong runtime validation, ensuring API inputs match expectations. This is applied to single transaction creation and bulk imports, often with constraints (e.g., max 100 transactions in a batch).
