/**
 * Currency utilities for Cimantikós Admin Dashboard
 * All prices are in Ghana Cedis (GHS)
 */

/**
 * Formats a number as Ghana Cedis (GHS)
 * @param amount - The amount to format
 * @param options - Formatting options
 * @returns Formatted currency string (e.g., "GHS 450.00")
 */
export function formatCurrency(
  amount: number | string | null | undefined,
  options?: {
    showSymbol?: boolean; // Show "GHS" prefix (default: true)
    showDecimals?: boolean; // Show decimal places (default: true)
    shortFormat?: boolean; // Use compact format for large numbers (default: false)
  }
): string {
  const {
    showSymbol = true,
    showDecimals = true,
    shortFormat = false,
  } = options || {};

  // Handle null/undefined
  if (amount === null || amount === undefined) {
    return showSymbol ? "GHS 0.00" : "0.00";
  }

  // Convert to number
  const numAmount = typeof amount === "string" ? parseFloat(amount) : amount;

  // Handle invalid numbers
  if (isNaN(numAmount)) {
    return showSymbol ? "GHS 0.00" : "0.00";
  }

  // Format with compact notation for large numbers
  if (shortFormat && numAmount >= 1000) {
    const formatted = new Intl.NumberFormat("en-GH", {
      notation: "compact",
      compactDisplay: "short",
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    }).format(numAmount);
    return showSymbol ? `GHS ${formatted}` : formatted;
  }

  // Standard formatting
  const formatted = new Intl.NumberFormat("en-GH", {
    minimumFractionDigits: showDecimals ? 2 : 0,
    maximumFractionDigits: showDecimals ? 2 : 0,
  }).format(numAmount);

  return showSymbol ? `GHS ${formatted}` : formatted;
}

/**
 * Parses a currency string to a number
 * @param value - Currency string (e.g., "GHS 450.00" or "450.00")
 * @returns Parsed number or 0 if invalid
 */
export function parseCurrency(value: string): number {
  // Remove currency symbols and whitespace
  const cleaned = value.replace(/GHS|₵|,|\s/g, "").trim();
  const parsed = parseFloat(cleaned);
  return isNaN(parsed) ? 0 : parsed;
}

/**
 * Validates if a value is a valid currency amount
 * @param value - Value to validate
 * @returns True if valid, false otherwise
 */
export function isValidCurrencyAmount(value: string | number): boolean {
  if (typeof value === "number") {
    return !isNaN(value) && isFinite(value) && value >= 0;
  }

  const parsed = parseCurrency(value);
  return !isNaN(parsed) && isFinite(parsed) && parsed >= 0;
}

/**
 * Calculates the balance from total and deposit
 * @param total - Total price
 * @param deposit - Deposit amount
 * @returns Balance amount
 */
export function calculateBalance(
  total: number | string,
  deposit: number | string
): number {
  const totalNum = typeof total === "string" ? parseFloat(total) : total;
  const depositNum = typeof deposit === "string" ? parseFloat(deposit) : deposit;

  if (isNaN(totalNum) || isNaN(depositNum)) {
    return 0;
  }

  return Math.max(0, totalNum - depositNum);
}

/**
 * Currency constant
 */
export const CURRENCY = {
  code: "GHS",
  symbol: "₵",
  name: "Ghana Cedi",
  locale: "en-GH",
} as const;
