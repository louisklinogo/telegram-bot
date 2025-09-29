import { isProduction } from "@cimantikos/config";
import type { Context, Next } from "hono";
import { rateLimitInfoSchema, type SecurityEvent, securityEventSchema } from "../telegram/schemas";

/**
 * Production-ready rate limiting middleware
 * Implements per-user and global rate limiting with security logging
 * Prevents abuse and DDoS attacks
 */

interface RateLimitStore {
  get(key: string): Promise<RateLimitData | null>;
  set(key: string, data: RateLimitData, ttl: number): Promise<void>;
  delete(key: string): Promise<void>;
  increment(key: string, ttl: number): Promise<number>;
}

interface RateLimitData {
  count: number;
  resetTime: number;
  firstRequest: number;
}

interface RateLimitConfig {
  // Per-user limits
  userLimit: number; // requests per window
  userWindow: number; // window in seconds

  // Global limits
  globalLimit: number; // requests per window
  globalWindow: number; // window in seconds

  // Security settings
  blockDuration: number; // seconds to block after repeated violations
  maxViolations: number; // violations before extended block
  skipSuccessfulRequests: boolean; // only count failed requests
}

// Default configuration
const DEFAULT_CONFIG: RateLimitConfig = {
  userLimit: isProduction() ? 30 : 100, // Production: 30 req/min, Development: 100 req/min
  userWindow: 60, // 1 minute window

  globalLimit: isProduction() ? 1000 : 5000, // Production: 1000 req/min, Development: 5000 req/min
  globalWindow: 60, // 1 minute window

  blockDuration: 300, // 5 minutes block for violations
  maxViolations: 5, // Block after 5 violations
  skipSuccessfulRequests: false,
};

// In-memory store implementation (for development)
class MemoryRateLimitStore implements RateLimitStore {
  private store = new Map<string, { data: RateLimitData; expiry: number }>();
  private violations = new Map<string, { count: number; expiry: number }>();

  async get(key: string): Promise<RateLimitData | null> {
    const entry = this.store.get(key);
    if (!entry || Date.now() > entry.expiry) {
      this.store.delete(key);
      return null;
    }
    return entry.data;
  }

  async set(key: string, data: RateLimitData, ttl: number): Promise<void> {
    this.store.set(key, {
      data,
      expiry: Date.now() + ttl * 1000,
    });
  }

  async delete(key: string): Promise<void> {
    this.store.delete(key);
  }

  async increment(key: string, ttl: number): Promise<number> {
    const now = Date.now();
    const entry = this.store.get(key);

    if (!entry || now > entry.expiry) {
      // Create new entry
      const data: RateLimitData = {
        count: 1,
        resetTime: now + ttl * 1000,
        firstRequest: now,
      };
      this.store.set(key, { data, expiry: data.resetTime });
      return 1;
    } else {
      // Increment existing entry
      entry.data.count++;
      return entry.data.count;
    }
  }

  // Security violation tracking
  async recordViolation(identifier: string): Promise<number> {
    const now = Date.now();
    const entry = this.violations.get(identifier);

    if (!entry || now > entry.expiry) {
      const newEntry = {
        count: 1,
        expiry: now + DEFAULT_CONFIG.blockDuration * 1000,
      };
      this.violations.set(identifier, newEntry);
      return 1;
    } else {
      entry.count++;
      // Extend block duration for repeated violations
      entry.expiry = now + DEFAULT_CONFIG.blockDuration * 1000 * entry.count;
      return entry.count;
    }
  }

  async getViolationCount(identifier: string): Promise<number> {
    const entry = this.violations.get(identifier);
    if (!entry || Date.now() > entry.expiry) {
      this.violations.delete(identifier);
      return 0;
    }
    return entry.count;
  }

  async isBlocked(identifier: string): Promise<boolean> {
    const violationCount = await this.getViolationCount(identifier);
    return violationCount >= DEFAULT_CONFIG.maxViolations;
  }

  // Cleanup expired entries periodically
  cleanup(): void {
    const now = Date.now();

    for (const [key, entry] of this.store.entries()) {
      if (now > entry.expiry) {
        this.store.delete(key);
      }
    }

    for (const [key, entry] of this.violations.entries()) {
      if (now > entry.expiry) {
        this.violations.delete(key);
      }
    }
  }
}

// Global store instance
const store = new MemoryRateLimitStore();

// Cleanup expired entries every 5 minutes
setInterval(
  () => {
    store.cleanup();
  },
  5 * 60 * 1000,
);

/**
 * Security event logger
 */
async function logSecurityEvent(event: SecurityEvent): Promise<void> {
  try {
    const validatedEvent = securityEventSchema.parse(event);

    // In production, this would send to a security monitoring system
    if (isProduction()) {
      console.error(
        "🚨 SECURITY EVENT:",
        JSON.stringify({
          type: validatedEvent.event_type,
          severity: validatedEvent.severity,
          user_id: validatedEvent.user_id,
          ip: validatedEvent.ip_address,
          timestamp: new Date(validatedEvent.timestamp * 1000).toISOString(),
        }),
      );
    } else {
      console.warn(
        "⚠️  Security Event:",
        validatedEvent.event_type,
        `(User: ${validatedEvent.user_id}, IP: ${validatedEvent.ip_address})`,
      );
    }
  } catch (error) {
    console.error("Failed to log security event:", error);
  }
}

/**
 * Get client identifier from request
 */
function getClientIdentifier(c: Context): {
  userId?: number;
  ip: string;
  userAgent?: string;
} {
  // Try to get user ID from request body or query
  let userId: number | undefined;

  try {
    const body = c.req.json();
    if (body && typeof body === "object" && "user_id" in body) {
      userId = Number(body.user_id);
    }
  } catch {
    // Ignore JSON parsing errors
  }

  // Get IP address (considering proxies)
  const ip =
    c.req.header("X-Forwarded-For")?.split(",")[0]?.trim() ||
    c.req.header("X-Real-IP") ||
    c.req.header("CF-Connecting-IP") ||
    "127.0.0.1";

  const userAgent = c.req.header("User-Agent");

  return { userId, ip, userAgent };
}

/**
 * Create rate limiting middleware
 */
export function createRateLimitMiddleware(config: Partial<RateLimitConfig> = {}) {
  const finalConfig = { ...DEFAULT_CONFIG, ...config };

  return async (c: Context, next: Next) => {
    const startTime = Date.now();
    const { userId, ip, userAgent } = getClientIdentifier(c);

    // Check if client is blocked due to repeated violations
    const blockKeys = [userId ? `block:user:${userId}` : null, `block:ip:${ip}`].filter(
      Boolean,
    ) as string[];

    for (const blockKey of blockKeys) {
      if (await store.isBlocked(blockKey)) {
        await logSecurityEvent({
          timestamp: Math.floor(Date.now() / 1000),
          event_type: "rate_limit_exceeded",
          severity: "high",
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          additional_info: {
            reason: "Client blocked due to repeated violations",
            block_key: blockKey,
          },
        });

        c.status(429);
        return c.json({
          error: "Too Many Requests",
          message: "Client temporarily blocked due to repeated violations",
          retry_after: finalConfig.blockDuration,
        });
      }
    }

    try {
      // Check per-user rate limit
      if (userId) {
        const userKey = `user:${userId}`;
        const userCount = await store.increment(userKey, finalConfig.userWindow);

        if (userCount > finalConfig.userLimit) {
          await store.recordViolation(`block:user:${userId}`);

          await logSecurityEvent({
            timestamp: Math.floor(Date.now() / 1000),
            event_type: "rate_limit_exceeded",
            severity: "medium",
            user_id: userId,
            ip_address: ip,
            user_agent: userAgent,
            additional_info: {
              limit_type: "user",
              count: userCount.toString(),
              limit: finalConfig.userLimit.toString(),
            },
          });

          const resetTime = Math.floor(Date.now() / 1000) + finalConfig.userWindow;

          c.status(429);
          c.header("X-RateLimit-Limit", finalConfig.userLimit.toString());
          c.header("X-RateLimit-Remaining", "0");
          c.header("X-RateLimit-Reset", resetTime.toString());
          c.header("Retry-After", finalConfig.userWindow.toString());

          return c.json({
            error: "Too Many Requests",
            message: `User rate limit exceeded. Maximum ${finalConfig.userLimit} requests per ${finalConfig.userWindow} seconds.`,
            retry_after: finalConfig.userWindow,
          });
        }

        // Add user rate limit headers
        c.header("X-RateLimit-Limit", finalConfig.userLimit.toString());
        c.header(
          "X-RateLimit-Remaining",
          Math.max(0, finalConfig.userLimit - userCount).toString(),
        );
        c.header(
          "X-RateLimit-Reset",
          Math.floor((Date.now() + finalConfig.userWindow * 1000) / 1000).toString(),
        );
      }

      // Check global rate limit
      const globalKey = "global";
      const globalCount = await store.increment(globalKey, finalConfig.globalWindow);

      if (globalCount > finalConfig.globalLimit) {
        await store.recordViolation(`block:ip:${ip}`);

        await logSecurityEvent({
          timestamp: Math.floor(Date.now() / 1000),
          event_type: "rate_limit_exceeded",
          severity: "high",
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          additional_info: {
            limit_type: "global",
            count: globalCount.toString(),
            limit: finalConfig.globalLimit.toString(),
          },
        });

        const resetTime = Math.floor(Date.now() / 1000) + finalConfig.globalWindow;

        c.status(429);
        c.header("X-Global-RateLimit-Limit", finalConfig.globalLimit.toString());
        c.header("X-Global-RateLimit-Remaining", "0");
        c.header("X-Global-RateLimit-Reset", resetTime.toString());
        c.header("Retry-After", finalConfig.globalWindow.toString());

        return c.json({
          error: "Too Many Requests",
          message: `Global rate limit exceeded. Please try again later.`,
          retry_after: finalConfig.globalWindow,
        });
      }

      // Add global rate limit headers
      c.header("X-Global-RateLimit-Limit", finalConfig.globalLimit.toString());
      c.header(
        "X-Global-RateLimit-Remaining",
        Math.max(0, finalConfig.globalLimit - globalCount).toString(),
      );

      // Continue to next middleware
      await next();

      // If we get here, the request was successful
      const duration = Date.now() - startTime;

      // Log slow requests as potential security issues
      if (duration > 5000) {
        // 5 seconds
        await logSecurityEvent({
          timestamp: Math.floor(Date.now() / 1000),
          event_type: "suspicious_content",
          severity: "low",
          user_id: userId,
          ip_address: ip,
          user_agent: userAgent,
          additional_info: {
            reason: "Slow request detected",
            duration_ms: duration.toString(),
            path: c.req.path,
          },
        });
      }
    } catch (error) {
      // Log middleware errors
      console.error("Rate limiting middleware error:", error);

      await logSecurityEvent({
        timestamp: Math.floor(Date.now() / 1000),
        event_type: "malformed_request",
        severity: "medium",
        user_id: userId,
        ip_address: ip,
        user_agent: userAgent,
        additional_info: {
          error: error instanceof Error ? error.message : "Unknown error",
        },
      });

      // Continue processing - don't block requests due to rate limiter errors
      await next();
    }
  };
}

/**
 * Create Telegram-specific rate limiter
 * Optimized for Telegram webhook patterns
 */
export function createTelegramRateLimit() {
  return createRateLimitMiddleware({
    userLimit: 60, // 60 messages per minute per user (1 per second average)
    userWindow: 60,
    globalLimit: 2000, // 2000 messages per minute globally
    globalWindow: 60,
    blockDuration: 600, // 10 minute block for violations
    maxViolations: 3, // Block after 3 violations (more strict for messaging)
  });
}

/**
 * Create API-specific rate limiter
 * More lenient for API endpoints
 */
export function createApiRateLimit() {
  return createRateLimitMiddleware({
    userLimit: 100, // 100 requests per minute per user
    userWindow: 60,
    globalLimit: 5000, // 5000 requests per minute globally
    globalWindow: 60,
    blockDuration: 300, // 5 minute block
    maxViolations: 5,
  });
}

/**
 * Get current rate limit status for a user/IP
 */
export async function getRateLimitStatus(
  userId?: number,
  ip?: string,
): Promise<{
  user?: { count: number; limit: number; resetTime: number };
  global: { count: number; limit: number; resetTime: number };
  blocked: boolean;
}> {
  const result: any = {
    global: { count: 0, limit: DEFAULT_CONFIG.globalLimit, resetTime: 0 },
    blocked: false,
  };

  // Check user rate limit
  if (userId) {
    const userData = await store.get(`user:${userId}`);
    const blocked = await store.isBlocked(`block:user:${userId}`);

    result.user = {
      count: userData?.count || 0,
      limit: DEFAULT_CONFIG.userLimit,
      resetTime: userData?.resetTime || 0,
    };

    result.blocked = result.blocked || blocked;
  }

  // Check IP block
  if (ip) {
    const ipBlocked = await store.isBlocked(`block:ip:${ip}`);
    result.blocked = result.blocked || ipBlocked;
  }

  // Check global rate limit
  const globalData = await store.get("global");
  result.global = {
    count: globalData?.count || 0,
    limit: DEFAULT_CONFIG.globalLimit,
    resetTime: globalData?.resetTime || 0,
  };

  return result;
}

/**
 * Manually reset rate limits (for admin use)
 */
export async function resetRateLimits(userId?: number, ip?: string): Promise<void> {
  if (userId) {
    await store.delete(`user:${userId}`);
    await store.delete(`block:user:${userId}`);
  }

  if (ip) {
    await store.delete(`block:ip:${ip}`);
  }
}

// Export store for testing
export { store as rateLimitStore };
