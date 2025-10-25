type FormatAmountParams = {
  currency: string;
  amount: number;
  locale?: string | null;
  minimumFractionDigits?: number;
  maximumFractionDigits?: number;
};

export function formatAmount({
  currency,
  amount,
  locale = "en-US",
  minimumFractionDigits = 2,
  maximumFractionDigits = 2,
}: FormatAmountParams) {
  if (!currency) {
    return amount.toLocaleString();
  }

  const safeLocale = locale ?? "en-US";

  return Intl.NumberFormat(safeLocale, {
    style: "currency",
    currency,
    minimumFractionDigits,
    maximumFractionDigits,
  }).format(amount);
}
