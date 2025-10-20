import type { ApiKey } from "@Faworra/auth/api-keys";

export interface CacheEntry<T> {
  data: T;
  timestamp: number;
  ttl: number;
}

export interface CacheStats {
  hits: number;
  misses: number;
  sets: number;
  deletes: number;
  size: number;
  hitRate: number;
}

/**
 * Enhanced in-memory cache for API keys with Redis-like interface
 * Can be easily replaced with Redis implementation later
 */
export class ApiKeyCache {
  private cache = new Map<string, CacheEntry<ApiKey>>();
  private stats = {
    hits: 0,
    misses: 0,
    sets: 0,
    deletes: 0,
  };
  
  private readonly defaultTTL: number;
  private cleanupInterval: NodeJS.Timeout;

  constructor(defaultTTL: number = 30 * 60 * 1000) { // 30 minutes like Midday
    this.defaultTTL = defaultTTL;
    
    // Start cleanup interval every 5 minutes
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 5 * 60 * 1000);
  }

  /**
   * Get cached API key by token hash
   */
  async get(tokenHash: string): Promise<ApiKey | null> {
    const entry = this.cache.get(tokenHash);
    
    if (!entry) {
      this.stats.misses++;
      return null;
    }

    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(tokenHash);
      this.stats.misses++;
      return null;
    }

    this.stats.hits++;
    return entry.data;
  }

  /**
   * Cache API key with optional TTL
   */
  async set(tokenHash: string, apiKey: ApiKey, ttl?: number): Promise<void> {
    // Don't cache the plaintext token
    const { token, ...cacheableApiKey } = apiKey;
    
    this.cache.set(tokenHash, {
      data: cacheableApiKey as ApiKey,
      timestamp: Date.now(),
      ttl: ttl || this.defaultTTL,
    });
    
    this.stats.sets++;
  }

  /**
   * Delete cached API key
   */
  async delete(tokenHash: string): Promise<void> {
    const deleted = this.cache.delete(tokenHash);
    if (deleted) {
      this.stats.deletes++;
    }
  }

  /**
   * Delete all cached entries for a specific API key ID
   */
  async deleteByApiKeyId(apiKeyId: string): Promise<void> {
    let deletedCount = 0;
    
    for (const [tokenHash, entry] of this.cache.entries()) {
      if (entry.data.id === apiKeyId) {
        this.cache.delete(tokenHash);
        deletedCount++;
      }
    }
    
    this.stats.deletes += deletedCount;
  }

  /**
   * Delete all cached entries for a team
   */
  async deleteByTeamId(teamId: string): Promise<void> {
    let deletedCount = 0;
    
    for (const [tokenHash, entry] of this.cache.entries()) {
      if (entry.data.teamId === teamId) {
        this.cache.delete(tokenHash);
        deletedCount++;
      }
    }
    
    this.stats.deletes += deletedCount;
  }

  /**
   * Check if key exists in cache
   */
  async exists(tokenHash: string): Promise<boolean> {
    const entry = this.cache.get(tokenHash);
    if (!entry) return false;
    
    // Check if expired
    if (Date.now() > entry.timestamp + entry.ttl) {
      this.cache.delete(tokenHash);
      return false;
    }
    
    return true;
  }

  /**
   * Clear all cached entries
   */
  async clear(): Promise<void> {
    const size = this.cache.size;
    this.cache.clear();
    this.stats.deletes += size;
  }

  /**
   * Get cache statistics
   */
  getStats(): CacheStats {
    return {
      ...this.stats,
      size: this.cache.size,
      hitRate: this.stats.hits / (this.stats.hits + this.stats.misses) || 0,
    };
  }

  /**
   * Clean up expired entries
   */
  private cleanup(): void {
    const now = Date.now();
    let cleanedCount = 0;
    
    for (const [tokenHash, entry] of this.cache.entries()) {
      if (now > entry.timestamp + entry.ttl) {
        this.cache.delete(tokenHash);
        cleanedCount++;
      }
    }
    
    if (cleanedCount > 0) {
      console.log(`🧹 Cleaned up ${cleanedCount} expired cache entries`);
    }
  }

  /**
   * Destroy cache and cleanup interval
   */
  destroy(): void {
    clearInterval(this.cleanupInterval);
    this.cache.clear();
  }
}

// Singleton instance
export const apiKeyCache = new ApiKeyCache();

// Graceful shutdown
process.on('SIGTERM', () => {
  apiKeyCache.destroy();
});

process.on('SIGINT', () => {
  apiKeyCache.destroy();
});