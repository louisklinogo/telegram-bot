/**
 * Data validation utilities with Zod schemas
 * Provides consistent validation across all business tools
 */

import { z } from "zod";

// Base validation schemas
export const BaseSchemas = {
  // Common field validations
  ghanaPhoneNumber: z
    .string()
    .regex(
      /^\+233[0-9]{9}$|^0[0-9]{9}$/,
      "Must be a valid Ghana phone number (+233xxxxxxxxx or 0xxxxxxxxx)",
    )
    .transform((phone) => (phone.startsWith("0") ? `+233${phone.slice(1)}` : phone)),

  email: z.string().email().optional(),

  currency: z
    .number()
    .min(0, "Amount must be positive")
    .max(1000000, "Amount must be less than 1,000,000 GHS"),

  date: z
    .string()
    .regex(/^\d{4}-\d{2}-\d{2}$/, "Date must be in YYYY-MM-DD format")
    .refine((date) => {
      const dateObj = new Date(date);
      const now = new Date();
      const maxPastDate = new Date();
      maxPastDate.setFullYear(now.getFullYear() - 5); // 5 years ago
      const maxFutureDate = new Date();
      maxFutureDate.setFullYear(now.getFullYear() + 1); // 1 year future

      return dateObj >= maxPastDate && dateObj <= maxFutureDate;
    }, "Date must be within 5 years past to 1 year future"),

  notionPageId: z
    .string()
    .regex(
      /^[a-f0-9]{8}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{4}-[a-f0-9]{12}$/,
      "Invalid Notion page ID format",
    ),

  url: z.string().url().optional(),
};

// Client validation schemas
export const ClientSchemas = {
  create: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim(),
    phone_number: BaseSchemas.ghanaPhoneNumber.optional(),
    email: BaseSchemas.email,
    referral_source: z
      .enum(["Instagram", "WhatsApp", "Word-of-Mouth", "Church", "Walk-in", "Referral"])
      .optional(),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  update: z.object({
    name: z
      .string()
      .min(2, "Name must be at least 2 characters")
      .max(100, "Name must be less than 100 characters")
      .trim()
      .optional(),
    phone_number: BaseSchemas.ghanaPhoneNumber.optional(),
    email: BaseSchemas.email,
    referral_source: z
      .enum(["Instagram", "WhatsApp", "Word-of-Mouth", "Church", "Walk-in", "Referral"])
      .optional(),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  search: z.object({
    name: z.string().optional(),
    phone_number: z.string().optional(),
    referral_source: z.string().optional(),
  }),
};

// Order validation schemas
export const OrderSchemas = {
  create: z.object({
    order_id: z
      .string()
      .min(1, "Order ID is required")
      .max(50, "Order ID must be less than 50 characters"),
    client_id: BaseSchemas.notionPageId,
    date: BaseSchemas.date,
    status: z.enum(["New", "In Progress", "Complete", "Delivered"]).default("New"),
    items: z
      .string()
      .min(1, "Items description is required")
      .max(1000, "Items description must be less than 1000 characters"),
    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(100, "Quantity must be less than 100"),
    total_price: BaseSchemas.currency,
    paid: z.boolean().default(false),
    invoice_file: BaseSchemas.url,
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  update: z.object({
    status: z.enum(["New", "In Progress", "Complete", "Delivered"]).optional(),
    items: z
      .string()
      .min(1, "Items description is required")
      .max(1000, "Items description must be less than 1000 characters")
      .optional(),
    quantity: z
      .number()
      .int("Quantity must be a whole number")
      .min(1, "Quantity must be at least 1")
      .max(100, "Quantity must be less than 100")
      .optional(),
    total_price: BaseSchemas.currency.optional(),
    paid: z.boolean().optional(),
    invoice_file: BaseSchemas.url,
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  search: z.object({
    order_id: z.string().optional(),
    client_name: z.string().optional(),
    status: z.enum(["New", "In Progress", "Complete", "Delivered"]).optional(),
    date_range: z
      .object({
        start: BaseSchemas.date,
        end: BaseSchemas.date,
      })
      .optional(),
    paid: z.boolean().optional(),
  }),
};

// Invoice validation schemas
export const InvoiceSchemas = {
  create: z
    .object({
      invoice_number: z
        .string()
        .min(1, "Invoice number is required")
        .max(50, "Invoice number must be less than 50 characters"),
      client_id: BaseSchemas.notionPageId,
      amount: BaseSchemas.currency,
      amount_paid: BaseSchemas.currency.default(0),
      status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).default("Draft"),
      date_issued: BaseSchemas.date,
      due_date: BaseSchemas.date,
      payment_method: z
        .enum(["Credit Card", "Bank Transfer", "PayPal", "Check", "Cash", "Mobile Money", "Other"])
        .optional(),
      invoice_pdf: BaseSchemas.url,
      notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
    })
    .refine((data) => data.amount_paid <= data.amount, {
      message: "Amount paid cannot exceed total amount",
      path: ["amount_paid"],
    })
    .refine((data) => new Date(data.due_date) >= new Date(data.date_issued), {
      message: "Due date must be after or equal to issue date",
      path: ["due_date"],
    }),

  update: z.object({
    amount: BaseSchemas.currency.optional(),
    amount_paid: BaseSchemas.currency.optional(),
    status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).optional(),
    date_issued: BaseSchemas.date.optional(),
    due_date: BaseSchemas.date.optional(),
    payment_method: z
      .enum(["Credit Card", "Bank Transfer", "PayPal", "Check", "Cash", "Mobile Money", "Other"])
      .optional(),
    invoice_pdf: BaseSchemas.url,
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  search: z.object({
    invoice_number: z.string().optional(),
    client_name: z.string().optional(),
    status: z.enum(["Draft", "Sent", "Paid", "Overdue"]).optional(),
    date_range: z
      .object({
        start: BaseSchemas.date,
        end: BaseSchemas.date,
      })
      .optional(),
    amount_range: z
      .object({
        min: BaseSchemas.currency,
        max: BaseSchemas.currency,
      })
      .optional(),
  }),
};

// Finance validation schemas
export const FinanceSchemas = {
  create: z.object({
    entry_name: z
      .string()
      .min(1, "Entry name is required")
      .max(200, "Entry name must be less than 200 characters")
      .trim(),
    type: z.enum(["Income", "Expense", "Transfer", "Refund", "Investment"]),
    category: z.enum([
      "Fabric",
      "Tailor Fee",
      "Transport",
      "Sale",
      "Supplies",
      "Rent",
      "Utilities",
      "Renovation",
      "Salary",
      "Food",
      "Miscellaneous",
    ]),
    amount: BaseSchemas.currency,
    date: BaseSchemas.date,
    payment_method: z.enum([
      "Cash",
      "Mobile Money (Momo)",
      "Bank Transfer",
      "Debit Card",
      "Credit Card",
      "Check",
    ]),
    linked_order: BaseSchemas.notionPageId.optional(),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
    receipt_file: BaseSchemas.url,
  }),

  update: z.object({
    entry_name: z
      .string()
      .min(1, "Entry name is required")
      .max(200, "Entry name must be less than 200 characters")
      .trim()
      .optional(),
    type: z.enum(["Income", "Expense", "Transfer", "Refund", "Investment"]).optional(),
    category: z
      .enum([
        "Fabric",
        "Tailor Fee",
        "Transport",
        "Sale",
        "Supplies",
        "Rent",
        "Utilities",
        "Renovation",
        "Salary",
        "Food",
        "Miscellaneous",
      ])
      .optional(),
    amount: BaseSchemas.currency.optional(),
    date: BaseSchemas.date.optional(),
    payment_method: z
      .enum(["Cash", "Mobile Money (Momo)", "Bank Transfer", "Debit Card", "Credit Card", "Check"])
      .optional(),
    linked_order: BaseSchemas.notionPageId.optional(),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
    receipt_file: BaseSchemas.url,
  }),

  search: z.object({
    type: z.enum(["Income", "Expense", "Transfer", "Refund", "Investment"]).optional(),
    category: z
      .enum([
        "Fabric",
        "Tailor Fee",
        "Transport",
        "Sale",
        "Supplies",
        "Rent",
        "Utilities",
        "Renovation",
        "Salary",
        "Food",
        "Miscellaneous",
      ])
      .optional(),
    date_range: z
      .object({
        start: BaseSchemas.date,
        end: BaseSchemas.date,
      })
      .optional(),
    amount_range: z
      .object({
        min: BaseSchemas.currency,
        max: BaseSchemas.currency,
      })
      .optional(),
    payment_method: z
      .enum(["Cash", "Mobile Money (Momo)", "Bank Transfer", "Debit Card", "Credit Card", "Check"])
      .optional(),
  }),
};

// Measurement validation schemas
export const MeasurementSchemas = {
  create: z.object({
    measurement_name: z
      .string()
      .min(1, "Measurement name is required")
      .max(100, "Measurement name must be less than 100 characters"),
    client_id: BaseSchemas.notionPageId,
    date_taken: BaseSchemas.date,
    // All measurements in inches
    chest: z
      .number()
      .min(8, "Chest must be at least 8 inches")
      .max(65, "Chest must be less than 65 inches")
      .optional(),
    shoulder: z
      .number()
      .min(8, "Shoulder must be at least 8 inches")
      .max(65, "Shoulder must be less than 65 inches")
      .optional(),
    sleeve: z
      .number()
      .min(8, "Sleeve must be at least 8 inches")
      .max(65, "Sleeve must be less than 65 inches")
      .optional(),
    waist: z
      .number()
      .min(8, "Waist must be at least 8 inches")
      .max(65, "Waist must be less than 65 inches")
      .optional(),
    hip: z
      .number()
      .min(8, "Hip must be at least 8 inches")
      .max(65, "Hip must be less than 65 inches")
      .optional(),
    lap: z
      .number()
      .min(8, "Lap must be at least 8 inches")
      .max(65, "Lap must be less than 65 inches")
      .optional(),
    calf: z
      .number()
      .min(8, "Calf must be at least 8 inches")
      .max(65, "Calf must be less than 65 inches")
      .optional(),
    neck: z
      .number()
      .min(8, "Neck must be at least 8 inches")
      .max(65, "Neck must be less than 65 inches")
      .optional(),
    stomach: z
      .number()
      .min(8, "Stomach must be at least 8 inches")
      .max(65, "Stomach must be less than 65 inches")
      .optional(),
    bicep_round: z
      .number()
      .min(8, "Bicep round must be at least 8 inches")
      .max(65, "Bicep round must be less than 65 inches")
      .optional(),
    top_length: z
      .string()
      .regex(
        /^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/,
        'Top length must be a number or dual entry like "31/37"',
      )
      .optional(),
    notes: z.string().max(500, "Notes must be less than 500 characters").optional(),
  }),

  update: z.object({
    measurement_name: z
      .string()
      .min(1, "Measurement name is required")
      .max(100, "Measurement name must be less than 100 characters")
      .optional(),
    date_taken: BaseSchemas.date.optional(),
    chest: z.number().min(8).max(65).optional(),
    shoulder: z.number().min(8).max(65).optional(),
    sleeve: z.number().min(8).max(65).optional(),
    waist: z.number().min(8).max(65).optional(),
    hip: z.number().min(8).max(65).optional(),
    lap: z.number().min(8).max(65).optional(),
    calf: z.number().min(8).max(65).optional(),
    neck: z.number().min(8).max(65).optional(),
    stomach: z.number().min(8).max(65).optional(),
    bicep_round: z.number().min(8).max(65).optional(),
    top_length: z
      .string()
      .regex(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/)
      .optional(),
    notes: z.string().max(500).optional(),
  }),
};

// Tool operation validation schemas
export const ToolOperationSchemas = {
  financeOperation: z.object({
    action: z.enum(["create", "read", "update", "delete", "summary", "report"]),
    entry_name: z.string().optional(),
    type: z.enum(["Income", "Expense", "Transfer", "Refund", "Investment"]).optional(),
    category: z
      .enum([
        "Fabric",
        "Tailor Fee",
        "Transport",
        "Sale",
        "Supplies",
        "Rent",
        "Utilities",
        "Renovation",
        "Salary",
        "Food",
        "Miscellaneous",
      ])
      .optional(),
    amount: BaseSchemas.currency.optional(),
    date: BaseSchemas.date.optional(),
    payment_method: z
      .enum(["Cash", "Mobile Money (Momo)", "Bank Transfer", "Debit Card", "Credit Card", "Check"])
      .optional(),
    linked_order: BaseSchemas.notionPageId.optional(),
    notes: z.string().max(500).optional(),
    receipt_file: BaseSchemas.url,
    filters: z
      .object({
        date_range: z
          .object({
            start: BaseSchemas.date,
            end: BaseSchemas.date,
          })
          .optional(),
        category: z.string().optional(),
        type: z.string().optional(),
        amount_range: z
          .object({
            min: BaseSchemas.currency,
            max: BaseSchemas.currency,
          })
          .optional(),
        payment_method: z.string().optional(),
      })
      .optional(),
  }),

  recordUpdate: z
    .object({
      database: z.enum(["clients", "orders", "invoices", "finances", "measurements"]),
      operation: z.enum(["update", "delete", "bulk_update"]),
      record_id: BaseSchemas.notionPageId.optional(),
      record_ids: z.array(BaseSchemas.notionPageId).optional(),
      updates: z.record(z.any()),
      validation_mode: z.enum(["strict", "lenient", "skip"]).default("strict"),
      create_backup: z.boolean().default(true),
      reason: z.string().max(200).optional(),
    })
    .refine(
      (data) => {
        if (data.operation === "bulk_update") {
          return data.record_ids && data.record_ids.length > 0;
        } else {
          return data.record_id;
        }
      },
      {
        message:
          "record_id is required for single updates, record_ids is required for bulk updates",
        path: ["record_id"],
      },
    ),

  businessAnalytics: z
    .object({
      report_type: z.enum(["kpis", "trends", "customers", "products", "cashflow", "performance"]),
      date_range: z.object({
        start: BaseSchemas.date,
        end: BaseSchemas.date,
      }),
      group_by: z.enum(["day", "week", "month", "quarter", "year"]).optional(),
      filters: z
        .object({
          customer: z.string().optional(),
          category: z.string().optional(),
          product_type: z.string().optional(),
          payment_method: z.string().optional(),
          status: z.string().optional(),
        })
        .optional(),
      comparison_period: z
        .object({
          start: BaseSchemas.date,
          end: BaseSchemas.date,
        })
        .optional(),
    })
    .refine(
      (data) => {
        const startDate = new Date(data.date_range.start);
        const endDate = new Date(data.date_range.end);
        return startDate <= endDate;
      },
      {
        message: "Start date must be before or equal to end date",
        path: ["date_range"],
      },
    ),
};

// Validation helper functions
export class ValidationHelper {
  /**
   * Validates data against a schema and returns formatted result
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): {
    success: boolean;
    data?: T;
    errors?: string[];
  } {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    } else {
      return {
        success: false,
        errors: result.error.errors.map((err) => `${err.path.join(".")}: ${err.message}`),
      };
    }
  }

  /**
   * Validates Ghana phone number format and normalizes it
   */
  static validateGhanaPhone(phone: string): {
    valid: boolean;
    normalized?: string;
    error?: string;
  } {
    const result = BaseSchemas.ghanaPhoneNumber.safeParse(phone);

    if (result.success) {
      return {
        valid: true,
        normalized: result.data,
      };
    } else {
      return {
        valid: false,
        error: result.error.errors[0].message,
      };
    }
  }

  /**
   * Validates date range and ensures logical order
   */
  static validateDateRange(
    start: string,
    end: string,
  ): {
    valid: boolean;
    error?: string;
  } {
    const schema = z
      .object({
        start: BaseSchemas.date,
        end: BaseSchemas.date,
      })
      .refine((data) => new Date(data.start) <= new Date(data.end), {
        message: "Start date must be before or equal to end date",
      });

    const result = schema.safeParse({ start, end });

    if (result.success) {
      return { valid: true };
    } else {
      return {
        valid: false,
        error: result.error.errors[0].message,
      };
    }
  }

  /**
   * Validates and calculates invoice amounts
   */
  static validateInvoiceAmounts(
    amount: number,
    amountPaid: number,
  ): {
    valid: boolean;
    amountDue?: number;
    error?: string;
  } {
    if (amountPaid > amount) {
      return {
        valid: false,
        error: "Amount paid cannot exceed total amount",
      };
    }

    if (amount < 0 || amountPaid < 0) {
      return {
        valid: false,
        error: "Amounts must be positive numbers",
      };
    }

    return {
      valid: true,
      amountDue: amount - amountPaid,
    };
  }

  /**
   * Validates measurement values are within human ranges
   */
  static validateMeasurements(measurements: Record<string, number>): {
    valid: boolean;
    errors?: string[];
  } {
    const errors: string[] = [];

    for (const [field, value] of Object.entries(measurements)) {
      if (typeof value === "number") {
        if (value < 8 || value > 65) {
          errors.push(`${field}: ${value} inches is outside realistic range (8-65 inches)`);
        }
      }
    }

    return {
      valid: errors.length === 0,
      errors: errors.length > 0 ? errors : undefined,
    };
  }
}

// Export all validation schemas for easy access
export const ValidationSchemas = {
  Base: BaseSchemas,
  Client: ClientSchemas,
  Order: OrderSchemas,
  Invoice: InvoiceSchemas,
  Finance: FinanceSchemas,
  Measurement: MeasurementSchemas,
  ToolOperation: ToolOperationSchemas,
};
