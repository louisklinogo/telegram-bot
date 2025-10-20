import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "@faworra/api/types/hono-env";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";

/**
 * Midday's exact error handling patterns
 * Simple, standardized error responses with consistent structure
 */

// Midday's exact error schemas
export const ErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

export const GeneralErrorSchema = z.object({
  code: z.string(),
  message: z.string(),
});

// Midday's validation error response (from OpenAPIHono defaultHook)
export const ValidationErrorSchema = z.object({
  success: z.literal(false),
  errors: z.array(z.any()),
});

export type ApiError = z.infer<typeof ErrorSchema>;
export type ValidationError = z.infer<typeof ValidationErrorSchema>;

// Midday's exact parseAPIError function
export function parseAPIError(error: unknown): ApiError {
  if (typeof error === "object" && error !== null && "error" in error) {
    const apiError = error as { error: { code: string; message: string } };

    return {
      code: apiError.error.code,
      message: apiError.error.message,
    };
  }

  return { 
    code: "unknown", 
    message: "An unknown error occurred" 
  };
}

// Standard error codes (commonly used patterns)
export const ErrorCodes = {
  // Authentication errors
  UNAUTHORIZED: "unauthorized",
  FORBIDDEN: "forbidden", 
  INVALID_CREDENTIALS: "invalid_credentials",
  TOKEN_EXPIRED: "token_expired",
  
  // Validation errors
  VALIDATION_ERROR: "validation_error",
  MISSING_REQUIRED_FIELD: "missing_required_field",
  INVALID_FORMAT: "invalid_format",
  
  // Business logic errors
  RESOURCE_NOT_FOUND: "resource_not_found",
  RESOURCE_CONFLICT: "resource_conflict",
  INSUFFICIENT_PERMISSIONS: "insufficient_permissions",
  
  // System errors
  INTERNAL_SERVER_ERROR: "internal_server_error",
  SERVICE_UNAVAILABLE: "service_unavailable",
  RATE_LIMIT_EXCEEDED: "rate_limit_exceeded",
  
  // External service errors (like Midday's bank connections)
  EXTERNAL_SERVICE_ERROR: "external_service_error",
  CONNECTION_FAILED: "connection_failed",
  DISCONNECTED: "disconnected",
} as const;

// Helper functions for common error responses
export function createApiError(code: string, message: string): ApiError {
  return { code, message };
}

export function createValidationError(errors: any[]): ValidationError {
  return { success: false, errors };
}

// HTTP Exception helpers (following Midday's patterns)
export function throwUnauthorized(message: string = "Unauthorized"): never {
  throw new HTTPException(401, { 
    message,
  });
}

export function throwForbidden(message: string = "Forbidden"): never {
  throw new HTTPException(403, { 
    message,
  });
}

export function throwNotFound(message: string = "Resource not found"): never {
  throw new HTTPException(404, { 
    message,
  });
}

export function throwValidationError(message: string = "Validation failed"): never {
  throw new HTTPException(422, { 
    message,
  });
}

export function throwRateLimitExceeded(message: string = "Rate limit exceeded"): never {
  throw new HTTPException(429, { 
    message,
  });
}

export function throwInternalError(message: string = "Internal server error"): never {
  throw new HTTPException(500, { 
    message,
  });
}

// Global error handler middleware (Midday's pattern)
export const globalErrorHandler: MiddlewareHandler<ApiEnv> = async (c, next) => {
  try {
    await next();
  } catch (error) {
    console.error("Global error handler:", error);
    
    // Handle HTTPException (from Hono)
    if (error instanceof HTTPException) {
      const status = error.status;
      const message = error.message;
      
      // Map HTTP status to error code
      let code: string;
      switch (status) {
        case 400:
          code = ErrorCodes.VALIDATION_ERROR;
          break;
        case 401:
          code = ErrorCodes.UNAUTHORIZED;
          break;
        case 403:
          code = ErrorCodes.FORBIDDEN;
          break;
        case 404:
          code = ErrorCodes.RESOURCE_NOT_FOUND;
          break;
        case 422:
          code = ErrorCodes.VALIDATION_ERROR;
          break;
        case 429:
          code = ErrorCodes.RATE_LIMIT_EXCEEDED;
          break;
        case 500:
        default:
          code = ErrorCodes.INTERNAL_SERVER_ERROR;
          break;
      }
      
      return c.json(createApiError(code, message), status);
    }
    
    // Handle validation errors (Zod/OpenAPI)
    if (error && typeof error === "object" && "errors" in error) {
      return c.json(createValidationError((error as any).errors), 422);
    }
    
    // Handle unknown errors
    const apiError = parseAPIError(error);
    return c.json(apiError, 500);
  }
};

// OpenAPI validation error hook (Midday's exact pattern)
export const openApiErrorHook = (result: any, c: any) => {
  if (!result.success) {
    return c.json(
      createValidationError(result.error.errors), 
      422
    );
  }
};

// Request validation middleware (simple like Midday)
export const validateRequest = (requiredFields: string[] = []): MiddlewareHandler<ApiEnv> => {
  return async (c, next) => {
    if (["POST", "PUT", "PATCH"].includes(c.req.method)) {
      try {
        const body = await c.req.json();
        const errors: string[] = [];
        
        // Check required fields
        for (const field of requiredFields) {
          if (!body || !(field in body) || body[field] === null || body[field] === undefined) {
            errors.push(`Required field '${field}' is missing`);
          }
        }
        
        if (errors.length > 0) {
          throw new HTTPException(422, { 
            message: "Validation failed"
          });
        }
        
        // Store validated body
        c.set("validatedBody", body);
      } catch (error) {
        if (error instanceof HTTPException) {
          throw error;
        }
        throw new HTTPException(400, { 
          message: "Invalid JSON body" 
        });
      }
    }
    
    await next();
  };
};

// Health check helper (Midday pattern)
export const healthCheck = async (): Promise<{ status: string; timestamp: string }> => {
  // Add your health checks here (database, external services, etc.)
  try {
    // Example: await checkDatabase();
    // Example: await checkExternalServices();
    
    return {
      status: "ok",
      timestamp: new Date().toISOString(),
    };
  } catch (error) {
    throw createApiError(
      ErrorCodes.SERVICE_UNAVAILABLE,
      "Health check failed"
    );
  }
};

// Health check endpoint handler
export const healthCheckHandler: MiddlewareHandler<ApiEnv> = async (c) => {
  try {
    const health = await healthCheck();
    return c.json(health, 200);
  } catch (error) {
    const apiError = parseAPIError(error);
    return c.json(apiError, 503);
  }
};

export default {
  // Error schemas
  ErrorSchema,
  GeneralErrorSchema,
  ValidationErrorSchema,
  
  // Error utilities
  parseAPIError,
  createApiError,
  createValidationError,
  ErrorCodes,
  
  // HTTP helpers
  throwUnauthorized,
  throwForbidden, 
  throwNotFound,
  throwValidationError,
  throwRateLimitExceeded,
  throwInternalError,
  
  // Middleware
  globalErrorHandler,
  openApiErrorHook,
  validateRequest,
  
  // Health check
  healthCheck,
  healthCheckHandler,
};