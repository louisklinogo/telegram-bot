import type { ApiEnv } from "@faworra/api/types/hono-env";
import type { MiddlewareHandler } from "hono";
import { createClient, type RedisClientType } from "redis";

// Rate limiting strategy types
export type RateLimitStrategy = "fixed-window" | "sliding-window" | "token-bucket" | "leaky-bucket";

export interface RateLimitConfig {
  strategy: RateLimitStrategy;
  windowMs: number;
  limit: number;
  keyGenerator?: (c: any) => string;
  skipFailedRequests?: boolean;
  skipSuccessfulRequests?: boolean;
  onLimitReached?: (c: any, info: RateLimitInfo) => Promise<any> | any;
  message?: string | ((info: RateLimitInfo) => string);
  statusCode?: number;
  headers?: boolean;
  standardHeaders?: boolean;
  legacyHeaders?: boolean;
}

export interface RateLimitInfo {
  limit: number;
  current: number;
  remaining: number;
  resetTime: Date;
  totalHits: number;
  strategy: RateLimitStrategy;
}

export interface TokenBucketConfig {
  capacity: number;
  refillRate: number; // tokens per second
  refillPeriod?: number; // milliseconds between refills
}

export interface SlidingWindowConfig {
  precision?: number; // sub-windows for sliding window (default: 10)
}

// Redis-based rate limiter class
export class RedisRateLimiter {
  private redis: RedisClientType | null = null;
  private connected = false;
  private connectionPromise: Promise<void> | null = null;

  constructor(
    private redisUrl: string = process.env.REDIS_URL || "redis://localhost:6379",
    private prefix = "rl:"
  ) {}

  private async connect(): Promise<RedisClientType> {
    if (this.connected && this.redis) {
      return this.redis;
    }

    if (this.connectionPromise) {
      await this.connectionPromise;
      return this.redis!;
    }

    this.connectionPromise = this.establishConnection();
    await this.connectionPromise;
    return this.redis!;
  }

  private async establishConnection(): Promise<void> {
    try {
      this.redis = createClient({
        url: this.redisUrl,
        socket: {
          connectTimeout: 15_000,
          // IPv6 for production environments
          family: process.env.NODE_ENV === "production" ? 6 : 4,
          reconnectStrategy: (retries) => {
            if (retries > 10) {
              console.error("Redis reconnection failed after 10 attempts");
              return new Error("Redis reconnection failed");
            }
            return Math.min(retries * 100, 3000);
          },
        },
      });

      this.redis.on("error", (err) => {
        console.error("Redis rate limiter error:", err);
        this.connected = false;
      });

      this.redis.on("connect", () => {
        console.log("🔗 Redis rate limiter connected");
        this.connected = true;
      });

      this.redis.on("disconnect", () => {
        console.log("📡 Redis rate limiter disconnected");
        this.connected = false;
      });

      await this.redis.connect();
      this.connected = true;
    } catch (error) {
      console.error("Failed to connect to Redis for rate limiting:", error);
      this.connected = false;
      throw error;
    }
  }

  /**
   * Fixed Window Rate Limiting
   * Simple and memory efficient, but allows bursts at window boundaries
   */
  async fixedWindow(key: string, limit: number, windowMs: number): Promise<RateLimitInfo> {
    try {
      const redis = await this.connect();
      const window = Math.floor(Date.now() / windowMs);
      const redisKey = `${this.prefix}fw:${key}:${window}`;

      // Use Redis pipeline for atomic operations
      const pipeline = redis.multi();
      pipeline.incr(redisKey);
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));
      pipeline.ttl(redisKey);

      const results = await pipeline.exec();
      const current = results![0] as number;
      const ttl = results![2] as number;

      const resetTime = new Date(Date.now() + ttl * 1000);

      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        resetTime,
        totalHits: current,
        strategy: "fixed-window",
      };
    } catch (error) {
      console.error("Fixed window rate limiting error:", error);
      // Fallback: allow request if Redis is down
      return this.createFallbackInfo(limit, "fixed-window");
    }
  }

  /**
   * Sliding Window Rate Limiting
   * More accurate than fixed window, prevents burst at boundaries
   */
  async slidingWindow(
    key: string,
    limit: number,
    windowMs: number,
    precision = 10
  ): Promise<RateLimitInfo> {
    try {
      const redis = await this.connect();
      const now = Date.now();
      const window = windowMs / precision;
      const clearBefore = now - windowMs;

      const redisKey = `${this.prefix}sw:${key}`;

      // Remove old entries and add current request
      const pipeline = redis.multi();
      pipeline.zRemRangeByScore(redisKey, 0, clearBefore);
      pipeline.zAdd(redisKey, { score: now, value: `${now}-${Math.random()}` });
      pipeline.zCard(redisKey);
      pipeline.expire(redisKey, Math.ceil(windowMs / 1000));

      const results = await pipeline.exec();
      const current = results![2] as number;

      const resetTime = new Date(now + windowMs);

      return {
        limit,
        current,
        remaining: Math.max(0, limit - current),
        resetTime,
        totalHits: current,
        strategy: "sliding-window",
      };
    } catch (error) {
      console.error("Sliding window rate limiting error:", error);
      return this.createFallbackInfo(limit, "sliding-window");
    }
  }

  /**
   * Token Bucket Rate Limiting
   * Allows bursts up to bucket capacity, smooth rate limiting
   */
  async tokenBucket(
    key: string,
    config: TokenBucketConfig & { windowMs: number }
  ): Promise<RateLimitInfo> {
    try {
      const redis = await this.connect();
      const now = Date.now();
      const redisKey = `${this.prefix}tb:${key}`;

      // Lua script for atomic token bucket operations
      const luaScript = `
        local key = KEYS[1]
        local capacity = tonumber(ARGV[1])
        local refill_rate = tonumber(ARGV[2])
        local refill_period = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'tokens', 'last_refill')
        local tokens = tonumber(bucket[1]) or capacity
        local last_refill = tonumber(bucket[2]) or now
        
        -- Calculate tokens to add
        local time_passed = now - last_refill
        local periods_passed = math.floor(time_passed / refill_period)
        local tokens_to_add = periods_passed * refill_rate
        
        tokens = math.min(capacity, tokens + tokens_to_add)
        
        -- Try to consume a token
        local allowed = 0
        if tokens > 0 then
          tokens = tokens - 1
          allowed = 1
        end
        
        -- Update bucket state
        redis.call('HMSET', key, 'tokens', tokens, 'last_refill', now)
        redis.call('EXPIRE', key, math.ceil(${config.windowMs} / 1000))
        
        return {allowed, tokens, capacity}
      `;

      const result = (await redis.eval(luaScript, {
        keys: [redisKey],
        arguments: [
          config.capacity.toString(),
          config.refillRate.toString(),
          (config.refillPeriod || 1000).toString(),
          now.toString(),
        ],
      })) as [number, number, number];

      const [allowed, tokens, capacity] = result;
      const current = capacity - tokens;

      return {
        limit: config.capacity,
        current: allowed ? current + 1 : current,
        remaining: Math.max(0, tokens),
        resetTime: new Date(now + config.windowMs),
        totalHits: current,
        strategy: "token-bucket",
      };
    } catch (error) {
      console.error("Token bucket rate limiting error:", error);
      return this.createFallbackInfo(config.capacity, "token-bucket");
    }
  }

  /**
   * Leaky Bucket Rate Limiting
   * Smooth rate limiting with queue-like behavior
   */
  async leakyBucket(
    key: string,
    limit: number,
    windowMs: number,
    leakRate = 1
  ): Promise<RateLimitInfo> {
    try {
      const redis = await this.connect();
      const now = Date.now();
      const redisKey = `${this.prefix}lb:${key}`;

      // Lua script for atomic leaky bucket operations
      const luaScript = `
        local key = KEYS[1]
        local limit = tonumber(ARGV[1])
        local leak_rate = tonumber(ARGV[2])
        local window_ms = tonumber(ARGV[3])
        local now = tonumber(ARGV[4])
        
        local bucket = redis.call('HMGET', key, 'volume', 'last_leak')
        local volume = tonumber(bucket[1]) or 0
        local last_leak = tonumber(bucket[2]) or now
        
        -- Calculate leakage
        local time_passed = now - last_leak
        local leak_amount = (time_passed / 1000) * leak_rate
        volume = math.max(0, volume - leak_amount)
        
        -- Try to add request
        local allowed = 0
        if volume < limit then
          volume = volume + 1
          allowed = 1
        end
        
        -- Update bucket state
        redis.call('HMSET', key, 'volume', volume, 'last_leak', now)
        redis.call('EXPIRE', key, math.ceil(window_ms / 1000))
        
        return {allowed, volume, limit}
      `;

      const result = (await redis.eval(luaScript, {
        keys: [redisKey],
        arguments: [limit.toString(), leakRate.toString(), windowMs.toString(), now.toString()],
      })) as [number, number, number];

      const [allowed, volume] = result;

      return {
        limit,
        current: Math.ceil(volume),
        remaining: Math.max(0, limit - Math.ceil(volume)),
        resetTime: new Date(now + windowMs),
        totalHits: Math.ceil(volume),
        strategy: "leaky-bucket",
      };
    } catch (error) {
      console.error("Leaky bucket rate limiting error:", error);
      return this.createFallbackInfo(limit, "leaky-bucket");
    }
  }

  private createFallbackInfo(limit: number, strategy: RateLimitStrategy): RateLimitInfo {
    return {
      limit,
      current: 1,
      remaining: limit - 1,
      resetTime: new Date(Date.now() + 60_000), // 1 minute fallback
      totalHits: 1,
      strategy,
    };
  }

  async disconnect(): Promise<void> {
    if (this.redis && this.connected) {
      await this.redis.disconnect();
      this.connected = false;
    }
  }
}

// Singleton instance
const rateLimiter = new RedisRateLimiter();

// Default key generators
export const KeyGenerators = {
  /**
   * Generate key based on IP address
   */
  ip: (c: any): string => {
    const ip =
      c.req.header("x-forwarded-for") ||
      c.req.header("x-real-ip") ||
      c.req.header("remote-addr") ||
      "unknown";
    return `ip:${ip}`;
  },

  /**
   * Generate key based on user ID (requires auth)
   */
  user: (c: any): string => {
    const userId = c.get("userId") || "anonymous";
    return `user:${userId}`;
  },

  /**
   * Generate key based on team ID (requires auth)
   */
  team: (c: any): string => {
    const teamId = c.get("teamId") || "unknown";
    return `team:${teamId}`;
  },

  /**
   * Generate key based on API key ID
   */
  apiKey: (c: any): string => {
    const session = c.get("session");
    if (session?.type === "api_key" && session.apiKey) {
      return `api_key:${session.apiKey.id}`;
    }
    return KeyGenerators.ip(c);
  },

  /**
   * Generate composite key (IP + User)
   */
  composite: (c: any): string => {
    const userId = c.get("userId");
    const ip = KeyGenerators.ip(c).split(":")[1];
    return userId ? `composite:${userId}:${ip}` : `ip:${ip}`;
  },

  /**
   * Generate key based on endpoint
   */
  endpoint: (c: any): string => {
    const method = c.req.method;
    const path = c.req.path;
    const userId = c.get("userId") || "anonymous";
    return `endpoint:${userId}:${method}:${path}`;
  },
};

// Rate limiting middleware factory
export function createRateLimitMiddleware(config: RateLimitConfig): MiddlewareHandler<ApiEnv> {
  const keyGenerator = config.keyGenerator || KeyGenerators.ip;
  const headers = config.headers !== false;
  const standardHeaders = config.standardHeaders !== false;
  const legacyHeaders = config.legacyHeaders !== false;

  return async (c, next) => {
    const key = keyGenerator(c);
    let rateLimitInfo: RateLimitInfo;

    try {
      // Apply rate limiting based on strategy
      switch (config.strategy) {
        case "fixed-window":
          rateLimitInfo = await rateLimiter.fixedWindow(key, config.limit, config.windowMs);
          break;

        case "sliding-window": {
          const precision = (config as any).precision || 10;
          rateLimitInfo = await rateLimiter.slidingWindow(
            key,
            config.limit,
            config.windowMs,
            precision
          );
          break;
        }

        case "token-bucket": {
          const bucketConfig = config as RateLimitConfig & TokenBucketConfig;
          rateLimitInfo = await rateLimiter.tokenBucket(key, {
            capacity: bucketConfig.capacity || config.limit,
            refillRate: bucketConfig.refillRate || config.limit / (config.windowMs / 1000),
            refillPeriod: bucketConfig.refillPeriod || 1000,
            windowMs: config.windowMs,
          });
          break;
        }

        case "leaky-bucket": {
          const leakRate = (config as any).leakRate || 1;
          rateLimitInfo = await rateLimiter.leakyBucket(
            key,
            config.limit,
            config.windowMs,
            leakRate
          );
          break;
        }

        default:
          rateLimitInfo = await rateLimiter.fixedWindow(key, config.limit, config.windowMs);
      }

      // Add rate limit headers
      if (headers) {
        if (standardHeaders) {
          c.header("RateLimit-Limit", config.limit.toString());
          c.header("RateLimit-Remaining", rateLimitInfo.remaining.toString());
          c.header(
            "RateLimit-Reset",
            Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
          );
          c.header(
            "RateLimit-Policy",
            `${config.limit};w=${config.windowMs / 1000};strategy=${config.strategy}`
          );
        }

        if (legacyHeaders) {
          c.header("X-RateLimit-Limit", config.limit.toString());
          c.header("X-RateLimit-Remaining", rateLimitInfo.remaining.toString());
          c.header(
            "X-RateLimit-Reset",
            Math.ceil(rateLimitInfo.resetTime.getTime() / 1000).toString()
          );
        }
      }

      // Check if rate limit exceeded
      if (rateLimitInfo.current > config.limit) {
        const retryAfter = Math.ceil((rateLimitInfo.resetTime.getTime() - Date.now()) / 1000);
        c.header("Retry-After", retryAfter.toString());

        // Call custom handler if provided
        if (config.onLimitReached) {
          const result = await config.onLimitReached(c, rateLimitInfo);
          if (result) return result;
        }

        // Generate error message
        const message =
          typeof config.message === "function"
            ? config.message(rateLimitInfo)
            : config.message || `Rate limit exceeded. Try again in ${retryAfter} seconds.`;

        return c.json(
          {
            error: "Rate limit exceeded",
            message,
            retryAfter,
            limit: config.limit,
            remaining: rateLimitInfo.remaining,
            resetTime: rateLimitInfo.resetTime.toISOString(),
            strategy: config.strategy,
          },
          config.statusCode || 429
        );
      }

      // Store rate limit info for other middleware
      c.set("rateLimitInfo", rateLimitInfo);

      await next();

      // Skip counting failed requests if configured
      if (config.skipFailedRequests && c.res.status >= 400) {
        // Would need to implement request rollback here
        console.log("Skipping failed request count (not implemented)");
      }

      // Skip counting successful requests if configured
      if (config.skipSuccessfulRequests && c.res.status < 400) {
        // Would need to implement request rollback here
        console.log("Skipping successful request count (not implemented)");
      }
    } catch (error) {
      console.error("Rate limiting middleware error:", error);
      // Continue without rate limiting if there's an error
      await next();
    }
  };
}

// Predefined rate limiters with different strategies and use cases
export const RateLimiters = {
  /**
   * Strict rate limiter for authentication endpoints
   */
  authStrict: createRateLimitMiddleware({
    strategy: "sliding-window",
    windowMs: 15 * 60 * 1000, // 15 minutes
    limit: 5, // 5 attempts per 15 minutes
    keyGenerator: KeyGenerators.composite,
    message: "Too many authentication attempts. Please wait before trying again.",
    onLimitReached: async (c, info) => {
      console.log(`🚨 Auth rate limit exceeded for key: ${KeyGenerators.composite(c)}`);
    },
  }),

  /**
   * API rate limiter for general endpoints
   */
  apiGeneral: createRateLimitMiddleware({
    strategy: "token-bucket",
    windowMs: 60 * 1000, // 1 minute
    limit: 100, // 100 requests per minute
    capacity: 120, // Allow bursts up to 120
    refillRate: 100 / 60, // ~1.67 tokens per second
    keyGenerator: KeyGenerators.user,
  }),

  /**
   * Lenient rate limiter for authenticated users
   */
  authenticated: createRateLimitMiddleware({
    strategy: "sliding-window",
    windowMs: 60 * 1000, // 1 minute
    limit: 1000, // 1000 requests per minute
    keyGenerator: KeyGenerators.user,
    skipFailedRequests: true,
  }),

  /**
   * Strict rate limiter for unauthenticated requests
   */
  unauthenticated: createRateLimitMiddleware({
    strategy: "fixed-window",
    windowMs: 60 * 1000, // 1 minute
    limit: 60, // 60 requests per minute
    keyGenerator: KeyGenerators.ip,
  }),

  /**
   * File upload rate limiter
   */
  fileUpload: createRateLimitMiddleware({
    strategy: "leaky-bucket",
    windowMs: 10 * 60 * 1000, // 10 minutes
    limit: 10, // 10 uploads per 10 minutes
    leakRate: 1 / 60, // 1 upload per minute leak rate
    keyGenerator: KeyGenerators.user,
    message: "File upload rate limit exceeded. Please wait before uploading again.",
  }),

  /**
   * Search endpoint rate limiter
   */
  search: createRateLimitMiddleware({
    strategy: "token-bucket",
    windowMs: 60 * 1000, // 1 minute
    limit: 30, // 30 searches per minute
    capacity: 50, // Allow search bursts
    refillRate: 0.5, // 30 tokens per minute
    keyGenerator: KeyGenerators.endpoint,
  }),

  /**
   * Password reset rate limiter
   */
  passwordReset: createRateLimitMiddleware({
    strategy: "sliding-window",
    windowMs: 60 * 60 * 1000, // 1 hour
    limit: 3, // 3 password reset attempts per hour
    keyGenerator: (c: any) => {
      const email = c.req
        .json()
        .then((body: any) => body.email)
        .catch(() => "unknown");
      return `pwd_reset:${email}`;
    },
    message: "Too many password reset attempts. Please wait an hour before trying again.",
  }),
};

// Cleanup function for graceful shutdown
export async function shutdownRateLimiter(): Promise<void> {
  await rateLimiter.disconnect();
}

// Auto cleanup on process termination
process.on("SIGTERM", shutdownRateLimiter);
process.on("SIGINT", shutdownRateLimiter);

export default createRateLimitMiddleware;
