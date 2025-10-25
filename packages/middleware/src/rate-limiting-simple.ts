import type { ApiEnv } from "@faworra/api/types/hono-env";
import type { MiddlewareHandler } from "hono";
import { rateLimiter } from "hono-rate-limiter";

/**
 * Midday's exact rate limiting approach - simple and battle-tested
 * No Redis, no complex algorithms - just what works in production
 */

// Protected endpoint rate limiter (matches Midday exactly)
export const protectedRateLimiter = rateLimiter({
  windowMs: 10 * 60 * 1000, // 10 minutes (Midday's exact setting)
  limit: 100, // 100 requests per window (Midday's exact limit)
  keyGenerator: (c) => c.get("session")?.user?.id ?? "unknown",
  statusCode: 429,
  message: "Rate limit exceeded",
});

// OAuth-specific rate limiter (matches Midday exactly)
export const oauthRateLimiter = rateLimiter({
  windowMs: 15 * 60 * 1000, // 15 minutes (Midday's OAuth setting)
  limit: 20, // 20 requests per IP (Midday's exact limit)
  keyGenerator: (c) => c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
  statusCode: 429,
  message: "Rate limit exceeded",
});

// Midday's middleware composition pattern
export const protectedMiddleware: MiddlewareHandler<ApiEnv>[] = [
  // Note: withDatabase and withAuth would be imported from your auth package
  protectedRateLimiter, // Rate limiting after auth, before business logic
  // withPrimaryReadAfterWrite would go here
];

// Public middleware (no rate limiting like Midday)
export const publicMiddleware: MiddlewareHandler<ApiEnv>[] = [
  // Only database attachment for public endpoints
];

export default { protectedRateLimiter, oauthRateLimiter };
