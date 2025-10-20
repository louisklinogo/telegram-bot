import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "@faworra/api/types/hono-env";
import { z } from "zod";

// Transformation rule types
export interface TransformationRule {
  field: string;
  type: "sanitize" | "transform" | "validate" | "format";
  rule: string | RegExp | ((value: any) => any) | z.ZodSchema;
  errorMessage?: string;
  optional?: boolean;
}

export interface RequestTransformConfig {
  body?: TransformationRule[];
  query?: TransformationRule[];
  headers?: TransformationRule[];
  params?: TransformationRule[];
}

export interface ResponseTransformConfig {
  body?: TransformationRule[];
  headers?: Record<string, string | ((req: any) => string)>;
  statusCode?: number | ((originalStatus: number) => number);
}

export interface TransformationConfig {
  request?: RequestTransformConfig;
  response?: ResponseTransformConfig;
  skipOnError?: boolean;
  logTransformations?: boolean;
}

// Common transformation utilities
export class TransformUtils {
  /**
   * Sanitize HTML and potentially dangerous characters
   */
  static sanitizeHtml(input: string): string {
    return input
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#x27;")
      .replace(/\//g, "&#x2F;");
  }

  /**
   * Sanitize SQL injection attempts
   */
  static sanitizeSql(input: string): string {
    const sqlPatterns = [
      /(\b(SELECT|INSERT|UPDATE|DELETE|DROP|UNION|CREATE|ALTER|EXEC|EXECUTE)\b)/gi,
      /(--|\/\*|\*\/|;)/g,
      /(\bOR\b|\bAND\b)\s+\d+\s*=\s*\d+/gi,
    ];
    
    let sanitized = input;
    sqlPatterns.forEach(pattern => {
      sanitized = sanitized.replace(pattern, "");
    });
    
    return sanitized.trim();
  }

  /**
   * Transform phone numbers to consistent format
   */
  static formatPhoneNumber(phone: string, countryCode: string = "GH"): string {
    // Remove all non-digit characters
    const digits = phone.replace(/\D/g, "");
    
    if (countryCode === "GH" && digits.length === 10) {
      // Ghana format: +233 XX XXX XXXX
      return `+233 ${digits.substring(1, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
    }
    
    // Return original if cannot format
    return phone;
  }

  /**
   * Normalize email addresses
   */
  static normalizeEmail(email: string): string {
    return email.toLowerCase().trim();
  }

  /**
   * Format currency amounts
   */
  static formatCurrency(amount: number, currency: string = "GHS"): string {
    return new Intl.NumberFormat("en-GH", {
      style: "currency",
      currency: currency,
      minimumFractionDigits: 2,
    }).format(amount);
  }

  /**
   * Sanitize file names for safe storage
   */
  static sanitizeFileName(fileName: string): string {
    return fileName
      .replace(/[^a-zA-Z0-9.-]/g, "_")
      .replace(/_+/g, "_")
      .replace(/^_|_$/g, "")
      .toLowerCase();
  }

  /**
   * Parse and validate JSON safely
   */
  static safeJsonParse(jsonString: string): any {
    try {
      return JSON.parse(jsonString);
    } catch {
      return null;
    }
  }
}

// Predefined transformation rules for common use cases
export const CommonRules = {
  // Sanitization rules
  sanitizeHtml: (field: string): TransformationRule => ({
    field,
    type: "sanitize",
    rule: (value: string) => TransformUtils.sanitizeHtml(value),
  }),

  sanitizeSql: (field: string): TransformationRule => ({
    field,
    type: "sanitize", 
    rule: (value: string) => TransformUtils.sanitizeSql(value),
  }),

  // Validation rules
  validateEmail: (field: string): TransformationRule => ({
    field,
    type: "validate",
    rule: z.string().email(),
    errorMessage: "Invalid email format",
  }),

  validatePhone: (field: string, countryCode: string = "GH"): TransformationRule => ({
    field,
    type: "validate",
    rule: (value: string) => {
      const phoneRegex = countryCode === "GH" 
        ? /^(\+233|0)?[0-9]{9}$/ 
        : /^[+]?[1-9][\d\s\-\(\)]{7,15}$/;
      return phoneRegex.test(value.replace(/[\s\-\(\)]/g, ""));
    },
    errorMessage: `Invalid ${countryCode} phone number format`,
  }),

  validateUuid: (field: string): TransformationRule => ({
    field,
    type: "validate",
    rule: z.string().uuid(),
    errorMessage: "Invalid UUID format",
  }),

  // Transformation rules
  formatPhone: (field: string, countryCode: string = "GH"): TransformationRule => ({
    field,
    type: "transform",
    rule: (value: string) => TransformUtils.formatPhoneNumber(value, countryCode),
  }),

  normalizeEmail: (field: string): TransformationRule => ({
    field,
    type: "transform",
    rule: (value: string) => TransformUtils.normalizeEmail(value),
  }),

  formatCurrency: (field: string, currency: string = "GHS"): TransformationRule => ({
    field,
    type: "format",
    rule: (value: number) => TransformUtils.formatCurrency(value, currency),
  }),

  sanitizeFileName: (field: string): TransformationRule => ({
    field,
    type: "transform",
    rule: (value: string) => TransformUtils.sanitizeFileName(value),
  }),

  // Numeric transformations
  parseNumber: (field: string): TransformationRule => ({
    field,
    type: "transform",
    rule: (value: string | number) => {
      const num = typeof value === "string" ? parseFloat(value) : value;
      return isNaN(num) ? 0 : num;
    },
  }),

  roundCurrency: (field: string): TransformationRule => ({
    field,
    type: "transform",
    rule: (value: number) => Math.round(value * 100) / 100,
  }),
};

// Main transformation middleware factory
export const createTransformationMiddleware = (
  config: TransformationConfig
): MiddlewareHandler<ApiEnv> => {
  return async (c, next) => {
    const startTime = Date.now();
    let transformationErrors: string[] = [];

    try {
      // Transform request data
      if (config.request) {
        const transformationResult = await transformRequestData(c, config.request);
        if (transformationResult.errors.length > 0) {
          transformationErrors = transformationResult.errors;
          
          if (!config.skipOnError) {
            return c.json({
              error: "Request transformation failed",
              details: transformationErrors,
            }, 400);
          }
        }
      }

      // Process the request
      await next();

      // Transform response data
      if (config.response && c.res.status < 400) {
        await transformResponseData(c, config.response);
      }

      // Log transformation metrics
      if (config.logTransformations) {
        const duration = Date.now() - startTime;
        console.log(`🔄 Request transformed in ${duration}ms`, {
          method: c.req.method,
          path: c.req.path,
          transformationErrors: transformationErrors.length,
          duration,
        });
      }

    } catch (error) {
      console.error("Transformation middleware error:", error);
      
      if (!config.skipOnError) {
        return c.json({
          error: "Internal transformation error",
          message: error instanceof Error ? error.message : "Unknown error",
        }, 500);
      }
      
      // Continue without transformation if skipOnError is true
      await next();
    }
  };
};

// Request data transformation
async function transformRequestData(
  c: any,
  config: RequestTransformConfig
): Promise<{ errors: string[] }> {
  const errors: string[] = [];

  try {
    // Transform request body
    if (config.body && c.req.method !== "GET") {
      const body = await c.req.json().catch(() => ({}));
      const transformedBody = applyTransformationRules(body, config.body, errors);
      
      // Update request body (Hono-specific way)
      if (Object.keys(transformedBody).length > 0) {
        c.req.transformedBody = transformedBody;
      }
    }

    // Transform query parameters
    if (config.query) {
      const query = Object.fromEntries(c.req.queries());
      const transformedQuery = applyTransformationRules(query, config.query, errors);
      c.req.transformedQuery = transformedQuery;
    }

    // Transform headers
    if (config.headers) {
      const headers = Object.fromEntries(
        Array.from(c.req.raw.headers.entries())
      );
      const transformedHeaders = applyTransformationRules(headers, config.headers, errors);
      c.req.transformedHeaders = transformedHeaders;
    }

    // Transform path parameters
    if (config.params) {
      const params = c.req.param();
      const transformedParams = applyTransformationRules(params, config.params, errors);
      c.req.transformedParams = transformedParams;
    }

  } catch (error) {
    errors.push(`Request transformation error: ${error instanceof Error ? error.message : "Unknown error"}`);
  }

  return { errors };
}

// Response data transformation
async function transformResponseData(
  c: any,
  config: ResponseTransformConfig
): Promise<void> {
  try {
    // Get current response
    const response = await c.res.json().catch(() => null);
    
    if (response && config.body) {
      const errors: string[] = [];
      const transformedResponse = applyTransformationRules(response, config.body, errors);
      
      if (errors.length === 0) {
        c.res = c.json(transformedResponse);
      }
    }

    // Add response headers
    if (config.headers) {
      Object.entries(config.headers).forEach(([key, value]) => {
        const headerValue = typeof value === "function" 
          ? value(c.req) 
          : value;
        c.header(key, headerValue);
      });
    }

    // Modify status code if specified
    if (config.statusCode) {
      const newStatus = typeof config.statusCode === "function"
        ? config.statusCode(c.res.status)
        : config.statusCode;
      c.status(newStatus);
    }

  } catch (error) {
    console.error("Response transformation error:", error);
  }
}

// Apply transformation rules to data
function applyTransformationRules(
  data: any,
  rules: TransformationRule[],
  errors: string[]
): any {
  const result = { ...data };

  rules.forEach(rule => {
    try {
      const fieldExists = rule.field in result;
      const fieldValue = result[rule.field];

      // Skip if field is optional and doesn't exist
      if (rule.optional && !fieldExists) {
        return;
      }

      // Skip if field doesn't exist and is required
      if (!fieldExists && !rule.optional) {
        errors.push(`Required field '${rule.field}' is missing`);
        return;
      }

      // Apply the transformation rule
      switch (rule.type) {
        case "validate":
          if (rule.rule instanceof z.ZodSchema) {
            const validation = rule.rule.safeParse(fieldValue);
            if (!validation.success) {
              errors.push(rule.errorMessage || `Validation failed for field '${rule.field}'`);
            }
          } else if (typeof rule.rule === "function") {
            const isValid = rule.rule(fieldValue);
            if (!isValid) {
              errors.push(rule.errorMessage || `Validation failed for field '${rule.field}'`);
            }
          } else if (rule.rule instanceof RegExp) {
            if (!rule.rule.test(String(fieldValue))) {
              errors.push(rule.errorMessage || `Pattern validation failed for field '${rule.field}'`);
            }
          }
          break;

        case "sanitize":
        case "transform":
        case "format":
          if (typeof rule.rule === "function") {
            result[rule.field] = rule.rule(fieldValue);
          } else if (rule.rule instanceof RegExp && typeof rule.rule === "string") {
            result[rule.field] = String(fieldValue).replace(rule.rule as RegExp, rule.rule as string);
          }
          break;
      }

    } catch (error) {
      errors.push(`Error processing field '${rule.field}': ${error instanceof Error ? error.message : "Unknown error"}`);
    }
  });

  return result;
}

// Predefined middleware configurations for common scenarios
export const PresetTransformations = {
  /**
   * Client data sanitization for customer/client endpoints
   */
  clientDataSanitization: createTransformationMiddleware({
    request: {
      body: [
        CommonRules.sanitizeHtml("name"),
        CommonRules.sanitizeHtml("company"),
        CommonRules.sanitizeHtml("notes"),
        CommonRules.sanitizeHtml("address"),
        CommonRules.normalizeEmail("email"),
        CommonRules.formatPhone("phone"),
        CommonRules.formatPhone("whatsapp"),
        CommonRules.validateEmail("email"),
      ],
    },
    logTransformations: true,
    skipOnError: false,
  }),

  /**
   * Financial data validation and formatting
   */
  financialDataTransformation: createTransformationMiddleware({
    request: {
      body: [
        CommonRules.parseNumber("amount"),
        CommonRules.parseNumber("deposit_amount"),
        CommonRules.parseNumber("total_price"),
        CommonRules.roundCurrency("amount"),
        CommonRules.roundCurrency("deposit_amount"),
        CommonRules.roundCurrency("total_price"),
      ],
    },
    response: {
      body: [
        CommonRules.formatCurrency("amount"),
        CommonRules.formatCurrency("deposit_amount"), 
        CommonRules.formatCurrency("total_price"),
        CommonRules.formatCurrency("balance_amount"),
      ],
    },
    logTransformations: true,
  }),

  /**
   * File upload sanitization
   */
  fileUploadSanitization: createTransformationMiddleware({
    request: {
      body: [
        CommonRules.sanitizeFileName("filename"),
        CommonRules.sanitizeHtml("description"),
      ],
      headers: [
        CommonRules.sanitizeHtml("content-disposition"),
      ],
    },
    logTransformations: true,
  }),

  /**
   * Search and filter sanitization
   */
  searchSanitization: createTransformationMiddleware({
    request: {
      query: [
        CommonRules.sanitizeSql("search"),
        CommonRules.sanitizeSql("filter"),
        CommonRules.sanitizeHtml("q"),
        CommonRules.parseNumber("limit"),
        CommonRules.parseNumber("offset"),
      ],
    },
    logTransformations: false, // Don't log search queries for privacy
  }),
};

export default createTransformationMiddleware;