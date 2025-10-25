import type { ApiEnv } from "@faworra/api/types/hono-env";
import type { MiddlewareHandler } from "hono";
import { type RequestIdOptions, requestId } from "hono/request-id";

/**
 * Simple request correlation & tracing middleware
 * Uses Hono's built-in request-id middleware with additional tracing context
 */

export type CorrelationVariables = {
  requestId: string;
  traceId?: string;
  userId?: string;
  teamId?: string;
  startTime: number;
};

export type CorrelationOptions = {
  // Request ID options (passed to Hono's requestId middleware)
  limitLength?: number;
  headerName?: string;
  generator?: () => string;

  // Additional tracing options
  enableTracing?: boolean;
  traceHeaderName?: string;
  includeHeaders?: boolean;
  logRequests?: boolean;
};

// Default Faworra request ID generator (with prefix like Midday's)
const defaultGenerator = (): string =>
  `faw_req_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;

/**
 * Request correlation middleware with distributed tracing support
 * Keeps it simple like Midday - just correlation IDs and basic context
 */
export const correlationTracing = ({
  limitLength = 255,
  headerName = "X-Request-Id",
  generator = defaultGenerator,
  enableTracing = true,
  traceHeaderName = "X-Trace-Id",
  includeHeaders = false,
  logRequests = true,
}: CorrelationOptions = {}): MiddlewareHandler<ApiEnv> => {
  const requestIdMiddleware = requestId({
    limitLength,
    headerName,
    generator,
  });

  return async (c, next) => {
    const startTime = Date.now();

    // First apply Hono's request-id middleware
    await requestIdMiddleware(c, async () => {
      // Get request ID set by the middleware
      const reqId = c.get("requestId");

      // Handle tracing if enabled
      let traceId: string | undefined;
      if (enableTracing && traceHeaderName) {
        traceId = c.req.header(traceHeaderName);
        if (!traceId) {
          traceId = `faw_trace_${crypto.randomUUID().replace(/-/g, "").substring(0, 16)}`;
          c.header(traceHeaderName, traceId);
        }
      }

      // Extract user/team context from auth headers if available
      const authHeader = c.req.header("Authorization");
      let userId: string | undefined;
      let teamId: string | undefined;

      if (authHeader) {
        // Try to get user/team from JWT or API key context
        // This would be set by auth middleware that runs before this
        userId = c.get("userId");
        teamId = c.get("teamId");
      }

      // Set correlation variables
      c.set("requestId", reqId);
      c.set("traceId", traceId);
      c.set("userId", userId);
      c.set("teamId", teamId);
      c.set("startTime", startTime);

      // Log request start (simple like Midday)
      if (logRequests) {
        const logData: any = {
          requestId: reqId,
          method: c.req.method,
          path: c.req.path,
          userAgent: c.req.header("User-Agent"),
          ip: c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown",
          startTime: new Date(startTime).toISOString(),
        };

        if (traceId) logData.traceId = traceId;
        if (userId) logData.userId = userId;
        if (teamId) logData.teamId = teamId;

        // Include additional headers if requested (for debugging)
        if (includeHeaders) {
          const headers: Record<string, string> = {};
          c.req.raw.headers.forEach((value, key) => {
            // Only include safe headers
            if (["referer", "origin", "accept", "content-type"].includes(key.toLowerCase())) {
              headers[key] = value;
            }
          });
          logData.headers = headers;
        }

        console.log("[Request Start]", JSON.stringify(logData));
      }

      try {
        await next();

        // Log request completion
        if (logRequests) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          console.log(
            "[Request Complete]",
            JSON.stringify({
              requestId: reqId,
              traceId,
              method: c.req.method,
              path: c.req.path,
              status: c.res.status,
              duration: `${duration}ms`,
              userId,
              teamId,
              endTime: new Date(endTime).toISOString(),
            })
          );
        }
      } catch (error) {
        // Log request error
        if (logRequests) {
          const endTime = Date.now();
          const duration = endTime - startTime;

          console.error(
            "[Request Error]",
            JSON.stringify({
              requestId: reqId,
              traceId,
              method: c.req.method,
              path: c.req.path,
              duration: `${duration}ms`,
              error: error instanceof Error ? error.message : "Unknown error",
              userId,
              teamId,
              endTime: new Date(endTime).toISOString(),
            })
          );
        }

        throw error; // Re-throw for error middleware
      }
    });
  };
};

/**
 * Get correlation context from Hono context
 * Simple helper to extract all correlation data
 */
export const getCorrelationContext = (c: any): CorrelationVariables => ({
  requestId: c.get("requestId") || "unknown",
  traceId: c.get("traceId"),
  userId: c.get("userId"),
  teamId: c.get("teamId"),
  startTime: c.get("startTime") || Date.now(),
});

/**
 * Add correlation context to any object
 * Useful for structured logging, error reporting, etc.
 */
export const withCorrelationContext = <T extends object>(
  c: any,
  data: T
): T & CorrelationVariables => ({
  ...data,
  ...getCorrelationContext(c),
});

/**
 * Simple structured logger with correlation context
 * Follows the same pattern as Midday's logging
 */
export const createLogger = (c: any) => {
  const context = getCorrelationContext(c);

  return {
    info: (message: string, data?: any) => {
      console.log(
        JSON.stringify({
          level: "info",
          message,
          ...context,
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    },

    warn: (message: string, data?: any) => {
      console.warn(
        JSON.stringify({
          level: "warn",
          message,
          ...context,
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    },

    error: (message: string, error?: any, data?: any) => {
      console.error(
        JSON.stringify({
          level: "error",
          message,
          error:
            error instanceof Error
              ? {
                  name: error.name,
                  message: error.message,
                  stack: error.stack,
                }
              : error,
          ...context,
          ...data,
          timestamp: new Date().toISOString(),
        })
      );
    },
  };
};

// Performance monitoring helper
export const performanceMonitor = () => ({
  trackOperation: async <T>(
    c: any,
    operationName: string,
    operation: () => Promise<T>
  ): Promise<T> => {
    const context = getCorrelationContext(c);
    const startTime = Date.now();
    const logger = createLogger(c);

    try {
      logger.info(`Starting operation: ${operationName}`);
      const result = await operation();
      const duration = Date.now() - startTime;

      logger.info(`Operation completed: ${operationName}`, {
        duration: `${duration}ms`,
        success: true,
      });

      return result;
    } catch (error) {
      const duration = Date.now() - startTime;

      logger.error(`Operation failed: ${operationName}`, error, {
        duration: `${duration}ms`,
        success: false,
      });

      throw error;
    }
  },
});

export default {
  // Main middleware
  correlationTracing,

  // Utilities
  getCorrelationContext,
  withCorrelationContext,
  createLogger,
  performanceMonitor,
};
