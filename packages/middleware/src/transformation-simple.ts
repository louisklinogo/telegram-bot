import type { ApiEnv } from "@faworra/api/types/hono-env";
import type { MiddlewareHandler } from "hono";

/**
 * Simple transformation middleware following Midday's minimal approach
 * No complex rule engines - just basic sanitization and validation
 */

// Basic HTML sanitization (prevent XSS)
export function sanitizeHtml(input: string): string {
  return input
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#x27;");
}

// Basic SQL injection prevention
export function sanitizeString(input: string): string {
  return input
    .replace(/['";\\]/g, "") // Remove dangerous characters
    .trim();
}

// Simple email normalization
export function normalizeEmail(email: string): string {
  return email.toLowerCase().trim();
}

// Ghana phone number formatting (simple version)
export function formatGhanaPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");

  if (digits.length === 10 && digits.startsWith("0")) {
    // Convert 0XX XXX XXXX to +233 XX XXX XXXX
    return `+233 ${digits.substring(1, 3)} ${digits.substring(3, 6)} ${digits.substring(6)}`;
  }

  return phone; // Return original if can't format
}

// Simple request sanitization middleware (minimal like Midday)
export const requestSanitization: MiddlewareHandler<ApiEnv> = async (c, next) => {
  try {
    // Only sanitize POST/PUT/PATCH requests with JSON body
    if (["POST", "PUT", "PATCH"].includes(c.req.method)) {
      const body = await c.req.json().catch(() => null);

      if (body && typeof body === "object") {
        // Basic string field sanitization
        const sanitized = sanitizeObjectStrings(body);

        // Store sanitized body for use in handlers
        c.set("sanitizedBody", sanitized);
      }
    }

    await next();
  } catch (error) {
    console.error("Request sanitization error:", error);
    // Continue without sanitization if error occurs (fail open)
    await next();
  }
};

// Simple object string sanitization
function sanitizeObjectStrings(obj: any): any {
  if (typeof obj !== "object" || obj === null) {
    return obj;
  }

  if (Array.isArray(obj)) {
    return obj.map(sanitizeObjectStrings);
  }

  const sanitized: any = {};

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      // Basic sanitization for string fields
      if (key.includes("email")) {
        sanitized[key] = normalizeEmail(value);
      } else if (key.includes("phone") || key.includes("whatsapp")) {
        sanitized[key] = formatGhanaPhone(value);
      } else {
        sanitized[key] = sanitizeHtml(sanitizeString(value));
      }
    } else if (typeof value === "object") {
      sanitized[key] = sanitizeObjectStrings(value);
    } else {
      sanitized[key] = value;
    }
  }

  return sanitized;
}

// Simple validation middleware (basic checks only)
export const basicValidation: MiddlewareHandler<ApiEnv> = async (c, next) => {
  try {
    const body = c.get("sanitizedBody");

    if (body) {
      // Basic validation checks
      const errors: string[] = [];

      // Email validation
      if (body.email && !isValidEmail(body.email)) {
        errors.push("Invalid email format");
      }

      // Required fields (if specified)
      const requiredFields = c.get("requiredFields") as string[] | undefined;
      if (requiredFields) {
        for (const field of requiredFields) {
          if (!body[field]) {
            errors.push(`Required field '${field}' is missing`);
          }
        }
      }

      if (errors.length > 0) {
        return c.json({ error: "Validation failed", details: errors }, 400);
      }
    }

    await next();
  } catch (error) {
    console.error("Basic validation error:", error);
    // Continue without validation if error occurs
    await next();
  }
};

// Simple email validation
function isValidEmail(email: string): boolean {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

// Combined middleware (Midday's approach would be this simple)
export const dataProcessingMiddleware: MiddlewareHandler<ApiEnv>[] = [
  requestSanitization,
  basicValidation,
];

export default {
  requestSanitization,
  basicValidation,
  dataProcessingMiddleware,
  // Utility functions
  sanitizeHtml,
  sanitizeString,
  normalizeEmail,
  formatGhanaPhone,
};
