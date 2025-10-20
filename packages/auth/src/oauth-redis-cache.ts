import Redis from 'ioredis';
import type { OAuthApplication, OAuthAccessToken, OAuthAuthorizationCode } from './oauth-types';

/**
 * Advanced Redis-based Caching for OAuth
 * Following Midday's Redis caching patterns for OAuth tokens and security contexts
 * Implements sophisticated caching strategies with TTL, invalidation, and performance optimization
 */

export interface CacheOptions {
  redis?: Redis;
  defaultTTL?: number;
  keyPrefix?: string;
  compressionThreshold?: number;
  retryAttempts?: number;
  retryDelay?: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  errors: number;
}

const DEFAULT_OPTIONS: Required<CacheOptions> = {
  redis: new Redis({
    host: process.env.REDIS_HOST || 'localhost',
    port: parseInt(process.env.REDIS_PORT || '6379'),
    password: process.env.REDIS_PASSWORD,
    db: parseInt(process.env.REDIS_DB || '0'),
    retryDelayOnFailover: 100,
    enableOfflineQueue: false,
    lazyConnect: true,
  }),
  defaultTTL: 1800, // 30 minutes
  keyPrefix: 'faw:oauth:',
  compressionThreshold: 1024, // Compress values > 1KB
  retryAttempts: 3,
  retryDelay: 1000,
};

/**
 * OAuth Redis Cache Manager
 * Implements Midday's caching patterns with advanced features
 */
export class OAuthRedisCache {
  private redis: Redis;
  private options: Required<CacheOptions>;
  private stats: CacheStats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
    errors: 0,
  };

  constructor(options: Partial<CacheOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
    this.redis = this.options.redis;
    
    // Setup Redis event handlers
    this.setupEventHandlers();
  }

  /**
   * Cache OAuth applications with application-specific TTL
   * Following Midday's pattern of caching applications for 1 hour
   */
  async cacheOAuthApplication(clientId: string, application: OAuthApplication, ttl?: number): Promise<void> {
    const key = this.getKey('app', clientId);
    const value = JSON.stringify(application);
    const cacheTTL = ttl || 3600; // 1 hour for applications
    
    try {
      await this.redis.setex(key, cacheTTL, value);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache OAuth application:', error);
    }
  }

  /**
   * Retrieve OAuth application from cache
   */
  async getOAuthApplication(clientId: string): Promise<OAuthApplication | null> {
    const key = this.getKey('app', clientId);
    
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as OAuthApplication;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get OAuth application from cache:', error);
      return null;
    }
  }

  /**
   * Cache access tokens with short TTL for security
   * Following Midday's pattern of 30-minute token cache
   */
  async cacheAccessToken(tokenHash: string, tokenData: OAuthAccessToken, ttl?: number): Promise<void> {
    const key = this.getKey('token', tokenHash);
    const value = JSON.stringify(tokenData);
    const cacheTTL = ttl || 1800; // 30 minutes for access tokens
    
    try {
      await this.redis.setex(key, cacheTTL, value);
      this.stats.sets++;
      
      // Also add to user-specific token set for bulk invalidation
      const userKey = this.getKey('user_tokens', tokenData.userId);
      await this.redis.sadd(userKey, tokenHash);
      await this.redis.expire(userKey, cacheTTL);
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache access token:', error);
    }
  }

  /**
   * Retrieve access token from cache
   */
  async getAccessToken(tokenHash: string): Promise<OAuthAccessToken | null> {
    const key = this.getKey('token', tokenHash);
    
    try {
      const value = await this.redis.get(key);
      if (value) {
        this.stats.hits++;
        return JSON.parse(value) as OAuthAccessToken;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get access token from cache:', error);
      return null;
    }
  }

  /**
   * Cache authorization codes with very short TTL (10 minutes)
   * Following OAuth security best practices
   */
  async cacheAuthorizationCode(codeHash: string, codeData: OAuthAuthorizationCode): Promise<void> {
    const key = this.getKey('auth_code', codeHash);
    const value = JSON.stringify(codeData);
    const cacheTTL = 600; // 10 minutes for auth codes
    
    try {
      await this.redis.setex(key, cacheTTL, value);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache authorization code:', error);
    }
  }

  /**
   * Retrieve and consume authorization code (one-time use)
   */
  async consumeAuthorizationCode(codeHash: string): Promise<OAuthAuthorizationCode | null> {
    const key = this.getKey('auth_code', codeHash);
    
    try {
      // Use pipeline to atomically get and delete
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.del(key);
      const results = await pipeline.exec();
      
      if (results && results[0] && results[0][1]) {
        this.stats.hits++;
        this.stats.deletes++;
        return JSON.parse(results[0][1] as string) as OAuthAuthorizationCode;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to consume authorization code:', error);
      return null;
    }
  }

  /**
   * Cache CSRF state with medium TTL
   */
  async cacheCSRFState(stateToken: string, stateData: any): Promise<void> {
    const key = this.getKey('csrf_state', stateToken);
    const value = JSON.stringify(stateData);
    const cacheTTL = 600; // 10 minutes for CSRF state
    
    try {
      await this.redis.setex(key, cacheTTL, value);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache CSRF state:', error);
    }
  }

  /**
   * Retrieve and optionally consume CSRF state
   */
  async getCSRFState(stateToken: string, consume: boolean = false): Promise<any | null> {
    const key = this.getKey('csrf_state', stateToken);
    
    try {
      if (consume) {
        // Atomically get and delete
        const pipeline = this.redis.pipeline();
        pipeline.get(key);
        pipeline.del(key);
        const results = await pipeline.exec();
        
        if (results && results[0] && results[0][1]) {
          this.stats.hits++;
          this.stats.deletes++;
          return JSON.parse(results[0][1] as string);
        } else {
          this.stats.misses++;
          return null;
        }
      } else {
        const value = await this.redis.get(key);
        if (value) {
          this.stats.hits++;
          return JSON.parse(value);
        } else {
          this.stats.misses++;
          return null;
        }
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to get CSRF state:', error);
      return null;
    }
  }

  /**
   * Cache PKCE code verifier temporarily
   */
  async cachePKCEVerifier(codeChallenge: string, codeVerifier: string): Promise<void> {
    const key = this.getKey('pkce', codeChallenge);
    const cacheTTL = 600; // 10 minutes
    
    try {
      await this.redis.setex(key, cacheTTL, codeVerifier);
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to cache PKCE verifier:', error);
    }
  }

  /**
   * Retrieve and consume PKCE code verifier
   */
  async consumePKCEVerifier(codeChallenge: string): Promise<string | null> {
    const key = this.getKey('pkce', codeChallenge);
    
    try {
      // Atomically get and delete
      const pipeline = this.redis.pipeline();
      pipeline.get(key);
      pipeline.del(key);
      const results = await pipeline.exec();
      
      if (results && results[0] && results[0][1]) {
        this.stats.hits++;
        this.stats.deletes++;
        return results[0][1] as string;
      } else {
        this.stats.misses++;
        return null;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to consume PKCE verifier:', error);
      return null;
    }
  }

  /**
   * Invalidate all tokens for a specific user
   * Useful for logout or security incidents
   */
  async invalidateUserTokens(userId: string): Promise<void> {
    const userKey = this.getKey('user_tokens', userId);
    
    try {
      const tokenHashes = await this.redis.smembers(userKey);
      
      if (tokenHashes.length > 0) {
        const pipeline = this.redis.pipeline();
        
        // Delete all user tokens
        tokenHashes.forEach(tokenHash => {
          const tokenKey = this.getKey('token', tokenHash);
          pipeline.del(tokenKey);
        });
        
        // Delete user token set
        pipeline.del(userKey);
        
        await pipeline.exec();
        this.stats.deletes += tokenHashes.length + 1;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to invalidate user tokens:', error);
    }
  }

  /**
   * Invalidate OAuth application cache
   */
  async invalidateOAuthApplication(clientId: string): Promise<void> {
    const key = this.getKey('app', clientId);
    
    try {
      await this.redis.del(key);
      this.stats.deletes++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to invalidate OAuth application:', error);
    }
  }

  /**
   * Rate limiting with Redis
   * Following Midday's rate limiting patterns
   */
  async checkRateLimit(identifier: string, windowMs: number, limit: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalAttempts: number;
  }> {
    const key = this.getKey('rate_limit', identifier);
    const window = Math.floor(Date.now() / windowMs);
    const windowKey = `${key}:${window}`;
    
    try {
      const pipeline = this.redis.pipeline();
      pipeline.incr(windowKey);
      pipeline.expire(windowKey, Math.ceil(windowMs / 1000));
      const results = await pipeline.exec();
      
      const attempts = (results && results[0] && results[0][1]) ? results[0][1] as number : 1;
      const allowed = attempts <= limit;
      const remaining = Math.max(0, limit - attempts);
      const resetTime = (window + 1) * windowMs;
      
      return {
        allowed,
        remaining,
        resetTime,
        totalAttempts: attempts,
      };
    } catch (error) {
      this.stats.errors++;
      console.error('Rate limit check failed:', error);
      // Fail open - allow request if Redis fails
      return {
        allowed: true,
        remaining: limit - 1,
        resetTime: Date.now() + windowMs,
        totalAttempts: 1,
      };
    }
  }

  /**
   * Store security events for audit trail
   */
  async logSecurityEvent(event: {
    type: string;
    userId?: string;
    clientId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }): Promise<void> {
    const key = this.getKey('security_events', Date.now().toString());
    const eventData = {
      ...event,
      timestamp: new Date().toISOString(),
    };
    
    try {
      await this.redis.setex(key, 86400 * 7, JSON.stringify(eventData)); // 7 days
      
      // Also add to daily security log
      const dayKey = this.getKey('security_daily', new Date().toISOString().split('T')[0]);
      await this.redis.lpush(dayKey, JSON.stringify(eventData));
      await this.redis.expire(dayKey, 86400 * 30); // 30 days
      
      this.stats.sets++;
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to log security event:', error);
    }
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats & { hitRate: number } {
    const total = this.stats.hits + this.stats.misses;
    const hitRate = total > 0 ? (this.stats.hits / total) * 100 : 0;
    
    return {
      ...this.stats,
      hitRate: Math.round(hitRate * 100) / 100,
    };
  }

  /**
   * Clear all OAuth cache (use with caution)
   */
  async clearAllCache(): Promise<void> {
    try {
      const pattern = `${this.options.keyPrefix}*`;
      const keys = await this.redis.keys(pattern);
      
      if (keys.length > 0) {
        await this.redis.del(...keys);
        this.stats.deletes += keys.length;
      }
    } catch (error) {
      this.stats.errors++;
      console.error('Failed to clear cache:', error);
    }
  }

  /**
   * Health check for Redis connection
   */
  async healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }> {
    try {
      const start = Date.now();
      await this.redis.ping();
      const latency = Date.now() - start;
      
      return { healthy: true, latency };
    } catch (error) {
      return { 
        healthy: false, 
        error: error instanceof Error ? error.message : 'Unknown error' 
      };
    }
  }

  /**
   * Generate cache key with prefix
   */
  private getKey(namespace: string, identifier: string): string {
    return `${this.options.keyPrefix}${namespace}:${identifier}`;
  }

  /**
   * Setup Redis event handlers
   */
  private setupEventHandlers(): void {
    this.redis.on('error', (error) => {
      console.error('Redis connection error:', error);
      this.stats.errors++;
    });

    this.redis.on('connect', () => {
      console.log('Redis connected successfully');
    });

    this.redis.on('ready', () => {
      console.log('Redis ready for operations');
    });

    this.redis.on('close', () => {
      console.warn('Redis connection closed');
    });
  }
}

/**
 * OAuth cache types for better type safety
 */
export interface OAuthCacheOperations {
  // Application caching
  cacheOAuthApplication(clientId: string, application: OAuthApplication, ttl?: number): Promise<void>;
  getOAuthApplication(clientId: string): Promise<OAuthApplication | null>;
  invalidateOAuthApplication(clientId: string): Promise<void>;
  
  // Token caching
  cacheAccessToken(tokenHash: string, tokenData: OAuthAccessToken, ttl?: number): Promise<void>;
  getAccessToken(tokenHash: string): Promise<OAuthAccessToken | null>;
  invalidateUserTokens(userId: string): Promise<void>;
  
  // Authorization code caching
  cacheAuthorizationCode(codeHash: string, codeData: OAuthAuthorizationCode): Promise<void>;
  consumeAuthorizationCode(codeHash: string): Promise<OAuthAuthorizationCode | null>;
  
  // CSRF and PKCE
  cacheCSRFState(stateToken: string, stateData: any): Promise<void>;
  getCSRFState(stateToken: string, consume?: boolean): Promise<any | null>;
  cachePKCEVerifier(codeChallenge: string, codeVerifier: string): Promise<void>;
  consumePKCEVerifier(codeChallenge: string): Promise<string | null>;
  
  // Rate limiting
  checkRateLimit(identifier: string, windowMs: number, limit: number): Promise<{
    allowed: boolean;
    remaining: number;
    resetTime: number;
    totalAttempts: number;
  }>;
  
  // Security
  logSecurityEvent(event: any): Promise<void>;
  
  // Utilities
  getStats(): CacheStats & { hitRate: number };
  clearAllCache(): Promise<void>;
  healthCheck(): Promise<{ healthy: boolean; latency?: number; error?: string }>;
}

/**
 * Default OAuth cache instance
 */
export const oauthCache = new OAuthRedisCache();

export default oauthCache;