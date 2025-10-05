// ISO currency list (subset commonly used; extend as needed)
export type Currency = {
  code: string;
  name: string;
  symbol: string;
};

export const currencies: Currency[] = [
  { code: "GHS", name: "Ghana Cedi", symbol: "₵" },
  { code: "USD", name: "US Dollar", symbol: "$" },
  { code: "EUR", name: "Euro", symbol: "€" },
  { code: "GBP", name: "British Pound", symbol: "£" },
  { code: "NGN", name: "Nigerian Naira", symbol: "₦" },
  { code: "KES", name: "Kenyan Shilling", symbol: "KSh" },
  { code: "ZAR", name: "South African Rand", symbol: "R" },
  { code: "XOF", name: "West African CFA", symbol: "CFA" },
  { code: "XAF", name: "Central African CFA", symbol: "FCFA" },
  { code: "CAD", name: "Canadian Dollar", symbol: "$" },
  { code: "AUD", name: "Australian Dollar", symbol: "$" },
];

export const currencyCodes = currencies.map((c) => c.code);
