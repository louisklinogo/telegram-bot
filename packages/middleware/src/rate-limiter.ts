import type { Context, Next, MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

export interface RateLimitOptions {
  windowMs: number;
  limit: number;
  keyGenerator: (c: Context) => string;
  statusCode?: number;
  message?: string;
  skipSuccessfulRequests?: boolean;
  skipFailedRequests?: boolean;
  onLimitReached?: (key: string, c: Context) => Promise<void>;
}

interface RateLimitEntry {
  count: number;
  resetTime: number;
}

const rateLimitStore = new Map<string, RateLimitEntry>();

setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of rateLimitStore.entries()) {
    if (entry.resetTime < now) {
      rateLimitStore.delete(key);
    }
  }
}, 5 * 60 * 1000);

export interface RateLimitResult {
  exceeded: boolean;
  remaining: number;
  resetTime: number;
  current: number;
}

async function checkRateLimit(key: string, options: RateLimitOptions): Promise<RateLimitResult> {
  const now = Date.now();
  const resetTime = now + options.windowMs;
  let entry = rateLimitStore.get(key);

  if (!entry || entry.resetTime < now) {
    entry = { count: 1, resetTime };
    rateLimitStore.set(key, entry);
  } else {
    entry.count++;
  }

  const remaining = Math.max(0, options.limit - entry.count);
  const exceeded = entry.count > options.limit;

  return { exceeded, remaining, resetTime: entry.resetTime, current: entry.count };
}

export const rateLimiter = (options: RateLimitOptions): MiddlewareHandler => {
  return async (c: Context, next: Next) => {
    const key = options.keyGenerator(c);
    const limit = await checkRateLimit(key, options);

    c.header("X-RateLimit-Limit", options.limit.toString());
    c.header("X-RateLimit-Remaining", limit.remaining.toString());
    c.header("X-RateLimit-Reset", Math.ceil(limit.resetTime / 1000).toString());

    if (limit.exceeded) {
      if (options.onLimitReached) {
        try {
          await options.onLimitReached(key, c);
        } catch (error) {
          console.error("Rate limit handler error:", error);
        }
      }

      const retryAfter = Math.ceil((limit.resetTime - Date.now()) / 1000);
      c.header("Retry-After", retryAfter.toString());

      throw new HTTPException((options.statusCode as any) ?? 429, {
        message: options.message || "Rate limit exceeded",
      });
    }

    c.set("rateLimit", {
      limit: options.limit,
      current: limit.current,
      remaining: limit.remaining,
      resetTime: limit.resetTime,
    });

    await next();

    const responseStatus = c.res.status;
    let shouldSkip = false;

    if (options.skipSuccessfulRequests && responseStatus < 400) shouldSkip = true;
    else if (options.skipFailedRequests && responseStatus >= 400) shouldSkip = true;

    if (shouldSkip) {
      const entry = rateLimitStore.get(key);
      if (entry && entry.count > 0) {
        entry.count--;
        if (entry.count === 0) rateLimitStore.delete(key);
      }
    }
  };
};

export const RateLimiters = {
  public: rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 1000,
    keyGenerator: (c) => {
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0] : c.req.header("x-real-ip") || "unknown";
      return `public:${ip}`;
    },
    message: "Too many requests from this IP",
  }),

  authenticated: rateLimiter({
    windowMs: 10 * 60 * 1000,
    limit: 100,
    keyGenerator: (c) => {
      const session = c.get("session");
      return `auth:${session?.user?.id || "unknown"}`;
    },
    message: "Rate limit exceeded for authenticated user",
  }),

  admin: rateLimiter({
    windowMs: 5 * 60 * 1000,
    limit: 50,
    keyGenerator: (c) => {
      const session = c.get("session");
      return `admin:${session?.user?.id || "unknown"}`;
    },
    message: "Admin rate limit exceeded",
  }),

  apiKey: rateLimiter({
    windowMs: 1 * 60 * 1000,
    limit: 60,
    keyGenerator: (c) => {
      const session = c.get("session");
      return `api:${session?.user?.id || "unknown"}`;
    },
    message: "API rate limit exceeded",
    skipSuccessfulRequests: false,
  }),

  auth: rateLimiter({
    windowMs: 15 * 60 * 1000,
    limit: 20,
    keyGenerator: (c) => {
      const forwarded = c.req.header("x-forwarded-for");
      const ip = forwarded ? forwarded.split(",")[0] : c.req.header("x-real-ip") || "unknown";
      return `auth_attempt:${ip}`;
    },
    message: "Too many authentication attempts",
    skipSuccessfulRequests: true,
    onLimitReached: async (key) => {
      console.warn(`🚨 Rate limit reached for auth attempts: ${key}`);
    },
  }),
} as const;

export async function resetRateLimit(key: string): Promise<void> {
  rateLimitStore.delete(key);
}

export async function getRateLimitStatus(key: string): Promise<RateLimitEntry | null> {
  const entry = rateLimitStore.get(key);
  if (!entry || entry.resetTime < Date.now()) return null;
  return entry;
}

