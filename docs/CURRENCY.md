# Currency Guidelines - Cimantikós Admin Dashboard

## Currency Information

All monetary values in the Cimantikós Admin Dashboard are in **Ghana Cedis (GHS)**.

- **Currency Code**: GHS
- **Currency Symbol**: ₵
- **Locale**: en-GH

## Usage

### Importing the Utility

```typescript
import { formatCurrency, parseCurrency, CURRENCY } from "@/lib/currency";
```

### Formatting Currency

```typescript
// Basic formatting
formatCurrency(450.00)
// Output: "GHS 450.00"

// Without symbol
formatCurrency(450.00, { showSymbol: false })
// Output: "450.00"

// Without decimals
formatCurrency(450.50, { showDecimals: false })
// Output: "GHS 451"

// Compact format for large numbers
formatCurrency(15000, { shortFormat: true })
// Output: "GHS 15K"

// Handles null/undefined
formatCurrency(null)
// Output: "GHS 0.00"
```

### Parsing Currency

```typescript
// Parse currency string to number
parseCurrency("GHS 450.00")  // 450
parseCurrency("450.00")      // 450
parseCurrency("₵ 1,200.50")  // 1200.5
```

### Validation

```typescript
import { isValidCurrencyAmount } from "@/lib/currency";

isValidCurrencyAmount(450)         // true
isValidCurrencyAmount("450.00")    // true
isValidCurrencyAmount(-10)         // false
isValidCurrencyAmount("invalid")   // false
```

### Balance Calculation

```typescript
import { calculateBalance } from "@/lib/currency";

calculateBalance(1000, 400)  // 600
calculateBalance("1000.00", "400.00")  // 600
```

## Where to Apply Currency Formatting

### 1. **Order Components**

**File**: `apps/admin/src/app/orders/columns.tsx`

```typescript
import { formatCurrency } from "@/lib/currency";

// In the amount column
{
  accessorKey: "total_price",
  header: "Total",
  cell: ({ row }) => formatCurrency(row.original.total_price),
}

// For deposit amount
{
  accessorKey: "deposit_amount",
  header: "Deposit",
  cell: ({ row }) => formatCurrency(row.original.deposit_amount),
}

// For balance
{
  accessorKey: "balance_amount",
  header: "Balance",
  cell: ({ row }) => formatCurrency(row.original.balance_amount),
}
```

**File**: `apps/admin/src/components/order-sheet.tsx`

```typescript
// Display formatted totals
<div className="text-right text-sm text-muted-foreground">
  Subtotal: {formatCurrency(totalPrice)}
</div>
<div className="text-right font-medium">
  Total: {formatCurrency(totalPrice)}
</div>
```

### 2. **Invoice Components**

**File**: `apps/admin/src/app/invoices/columns.tsx`

```typescript
{
  accessorKey: "amount",
  header: "Amount",
  cell: ({ row }) => formatCurrency(row.original.amount),
}
```

### 3. **Dashboard Summary Cards**

```typescript
<Card>
  <CardHeader>
    <CardTitle>Total Revenue</CardTitle>
  </CardHeader>
  <CardContent>
    <p className="text-3xl font-bold">
      {formatCurrency(totalRevenue)}
    </p>
  </CardContent>
</Card>
```

### 4. **Input Fields (Optional)**

For currency input fields, you can add "GHS" as a prefix or use the `parseCurrency` function to clean user input:

```typescript
<div className="relative">
  <span className="absolute left-3 top-2.5 text-sm text-muted-foreground">
    GHS
  </span>
  <Input
    type="number"
    step="0.01"
    className="pl-14"
    placeholder="0.00"
  />
</div>
```

## Database Schema

All price fields in the database use `NUMERIC(10,2)` to store amounts in Ghana Cedis:

- `orders.total_price`
- `orders.deposit_amount`
- `orders.balance_amount`
- `invoices.amount`

The schema header includes: `CURRENCY: All monetary values are in Ghana Cedis (GHS)`

## Examples in Sample Data

See `scripts/schema-v2-seed-sample-data.sql` for realistic pricing examples:

- Wedding Kaftan: GHS 450.00
- Business Suit: GHS 850.00
- Casual Kaftan: GHS 350.00
- Agbada Set: GHS 1,200.00

## Testing

When testing currency formatting:

```typescript
import { formatCurrency, parseCurrency, calculateBalance } from "@/lib/currency";

// Format tests
console.log(formatCurrency(450));        // "GHS 450.00"
console.log(formatCurrency(1250.50));    // "GHS 1,250.50"
console.log(formatCurrency(15000, { shortFormat: true })); // "GHS 15K"

// Parse tests
console.log(parseCurrency("GHS 450.00")); // 450
console.log(parseCurrency("1,250.50"));   // 1250.5

// Balance calculation
console.log(calculateBalance(1000, 400)); // 600
```

## Future Considerations

If multi-currency support is needed in the future:

1. Add a `currency` column to relevant tables
2. Update the `formatCurrency` function to accept currency code parameter
3. Store exchange rates if needed
4. Update UI components to display appropriate currency symbols

For now, the app is optimized for Ghana Cedis (GHS) only.
