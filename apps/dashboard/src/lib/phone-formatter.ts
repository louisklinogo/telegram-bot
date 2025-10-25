// Phone number formatting patterns by country code
// Maps dial_code to format pattern and max digits
const PHONE_FORMATS: Record<string, { pattern: (digits: string) => string; maxDigits: number }> = {
  "+233": {
    // Ghana
    pattern: (d) => d.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    maxDigits: 9,
  },
  "+234": {
    // Nigeria
    pattern: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    maxDigits: 10,
  },
  "+254": {
    // Kenya
    pattern: (d) => d.replace(/(\d{3})(\d{3})(\d{3})/, "$1 $2 $3"),
    maxDigits: 9,
  },
  "+27": {
    // South Africa
    pattern: (d) => d.replace(/(\d{2})(\d{3})(\d{4})/, "$1 $2 $3"),
    maxDigits: 9,
  },
  "+1": {
    // US/Canada
    pattern: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, "($1) $2-$3"),
    maxDigits: 10,
  },
  "+44": {
    // UK
    pattern: (d) => d.replace(/(\d{4})(\d{6})/, "$1 $2"),
    maxDigits: 10,
  },
  "+33": {
    // France
    pattern: (d) => d.replace(/(\d{1})(\d{2})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4 $5"),
    maxDigits: 9,
  },
  "+49": {
    // Germany
    pattern: (d) => d.replace(/(\d{3})(\d{3})(\d{4})/, "$1 $2 $3"),
    maxDigits: 10,
  },
  "+39": {
    // Italy
    pattern: (d) => d.replace(/(\d{2})(\d{4})(\d{4})/, "$1 $2 $3"),
    maxDigits: 10,
  },
  "+34": {
    // Spain
    pattern: (d) => d.replace(/(\d{3})(\d{2})(\d{2})(\d{2})/, "$1 $2 $3 $4"),
    maxDigits: 9,
  },
  "+91": {
    // India
    pattern: (d) => d.replace(/(\d{5})(\d{5})/, "$1 $2"),
    maxDigits: 10,
  },
  "+86": {
    // China
    pattern: (d) => d.replace(/(\d{3})(\d{4})(\d{4})/, "$1 $2 $3"),
    maxDigits: 11,
  },
  "+81": {
    // Japan
    pattern: (d) => d.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3"),
    maxDigits: 10,
  },
  "+82": {
    // South Korea
    pattern: (d) => d.replace(/(\d{2})(\d{4})(\d{4})/, "$1-$2-$3"),
    maxDigits: 10,
  },
};

export function formatPhoneNumber(dialCode: string, phoneNumber: string): string {
  // Strip non-digits
  const digits = phoneNumber.replace(/\D/g, "");

  // Get format for this country
  const format = PHONE_FORMATS[dialCode];

  if (!format) {
    // Default: groups of 3
    return digits.replace(/(\d{3})(?=\d)/g, "$1 ").trim();
  }

  // Limit to max digits for this country
  const limited = digits.slice(0, format.maxDigits);

  // Apply country-specific format
  return format.pattern(limited);
}

export function getMaxPhoneDigits(dialCode: string): number {
  return PHONE_FORMATS[dialCode]?.maxDigits || 15;
}

export function getPhonePlaceholder(dialCode: string): string {
  const format = PHONE_FORMATS[dialCode];
  if (!format) return "123456789";

  // Example placeholder for each country
  const examples: Record<string, string> = {
    "+233": "50 123 4567",
    "+234": "901 234 5678",
    "+254": "712 345 678",
    "+27": "21 345 6789",
    "+1": "(201) 555-0123",
    "+44": "2079 460958",
    "+33": "1 23 45 67 89",
    "+49": "301 2345 67",
    "+39": "06 1234 5678",
    "+34": "912 34 56 78",
    "+91": "98765 43210",
    "+86": "138 1234 5678",
    "+81": "03-1234-5678",
    "+82": "02-1234-5678",
  };

  return examples[dialCode] || "123456789";
}
