import crypto from "crypto";
import bcrypt from "bcryptjs";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@Faworra/supabase/types";
import { apiKeyCache } from "@Faworra/cache/api-key-cache";

// Supabase client (you might want to move this to a shared location)
const supabase = createClient<Database>(
  process.env.SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export interface ApiKey {
  id: string;
  teamId: string;
  userId: string;
  name: string;
  token: string; // Only returned during creation
  hashedToken: string;
  scopes: string[];
  lastUsedAt?: Date;
  expiresAt: Date;
  revoked: boolean;
  createdAt: Date;
  updatedAt: Date;
  user?: {
    id: string;
    email?: string;
    fullName?: string;
  };
}

export interface CreateApiKeyParams {
  teamId: string;
  userId: string;
  name: string;
  scopes: string[];
  expiresInDays?: number;
}

export interface ApiKeyValidationResult {
  valid: boolean;
  apiKey?: ApiKey;
  error?: string;
}

// Available scopes for API keys
export const ApiKeyScopes = {
  // Read operations
  "read:users": "Read user information",
  "read:teams": "Read team information", 
  "read:data": "Read application data",
  
  // Write operations
  "write:users": "Create and update users",
  "write:teams": "Create and update teams",
  "write:data": "Create and update application data",
  
  // Admin operations
  "admin:users": "Manage users (delete, roles)",
  "admin:teams": "Manage teams (delete, settings)",
  "admin:system": "System administration",
  
  // Special scopes
  "webhook:receive": "Receive webhook notifications",
  "export:data": "Export data in various formats",
} as const;

export type ApiKeyScope = keyof typeof ApiKeyScopes;

export class ApiKeyService {
  /**
   * Generate a new API key with secure token and hashed storage
   */
  async generateApiKey(params: CreateApiKeyParams): Promise<ApiKey> {
    const { teamId, userId, name, scopes, expiresInDays = 365 } = params;
    
    // Generate secure token with faw_api_ prefix
    const randomBytes = crypto.randomBytes(32);
    const key = `faw_api_${randomBytes.toString('base64url')}`;
    
    // Hash token for secure storage (like Midday)
    const hashedToken = await bcrypt.hash(key, 12);
    
    // Calculate expiration date
    const expiresAt = new Date();
    expiresAt.setDate(expiresAt.getDate() + expiresInDays);
    
    // Create API key in database
    const apiKey = await this.createApiKeyInDb({
      teamId,
      userId,
      name,
      hashedToken,
      scopes,
      expiresAt,
    });
    
    return {
      ...apiKey,
      token: key, // Only return plaintext token once during creation
    };
  }
  
  /**
   * Validate an API key token
   */
  async validateApiKey(token: string): Promise<ApiKeyValidationResult> {
    if (!token.startsWith("faw_api_")) {
      return { valid: false, error: "Invalid token format" };
    }
    
    try {
      // Create a hash of the token for cache key (don't store plaintext)
      const tokenHash = crypto.createHash('sha256').update(token).digest('hex');
      
      // Check cache first
      const cached = await apiKeyCache.get(tokenHash);
      if (cached) {
        // Update last used timestamp async
        this.updateLastUsedAsync(cached.id);
        return { valid: true, apiKey: cached };
      }
      
      // Get active API keys from database
      const activeApiKeys = await this.getActiveApiKeys();
      
      for (const apiKey of activeApiKeys) {
        const isValid = await bcrypt.compare(token, apiKey.hashedToken);
        
        if (isValid) {
          // Check if expired
          if (new Date() > apiKey.expiresAt) {
            return { valid: false, error: "API key expired" };
          }
          
          // Check if revoked
          if (apiKey.revoked) {
            return { valid: false, error: "API key revoked" };
          }
          
          // Update last used timestamp
          await this.updateApiKeyLastUsed(apiKey.id);
          
          // Cache result for future requests
          await apiKeyCache.set(tokenHash, apiKey);
          
          return { valid: true, apiKey };
        }
      }
      
      return { valid: false, error: "Invalid API key" };
      
    } catch (error) {
      console.error("API key validation error:", error);
      return { valid: false, error: "Validation failed" };
    }
  }
  
  /**
   * Revoke an API key
   */
  async revokeApiKey(apiKeyId: string): Promise<void> {
    await this.updateApiKeyInDb(apiKeyId, { revoked: true });
    // Clear from cache
    await apiKeyCache.deleteByApiKeyId(apiKeyId);
  }
  
  /**
   * List API keys for a team
   */
  async listApiKeys(teamId: string): Promise<Omit<ApiKey, 'token' | 'hashedToken'>[]> {
    return this.getApiKeysByTeam(teamId);
  }
  
  /**
   * Update API key (name, scopes, etc.)
   */
  async updateApiKey(
    apiKeyId: string, 
    updates: Partial<Pick<ApiKey, 'name' | 'scopes'>>
  ): Promise<void> {
    await this.updateApiKeyInDb(apiKeyId, updates);
    // Clear cache to force refresh
    await apiKeyCache.deleteByApiKeyId(apiKeyId);
  }
  
  /**
   * Check if scopes are valid
   */
  validateScopes(scopes: string[]): { valid: boolean; invalid: string[] } {
    const validScopes = Object.keys(ApiKeyScopes);
    const invalid = scopes.filter(scope => !validScopes.includes(scope));
    
    return {
      valid: invalid.length === 0,
      invalid,
    };
  }

  /**
   * Log API key usage for analytics
   */
  async logUsage(apiKeyId: string, teamId: string, usage: {
    endpoint: string;
    method: string;
    statusCode: number;
    ipAddress?: string;
    userAgent?: string;
    requestSizeBytes?: number;
    responseSizeBytes?: number;
    responseTimeMs?: number;
  }): Promise<void> {
    try {
      await supabase
        .from("api_key_usage")
        .insert({
          api_key_id: apiKeyId,
          team_id: teamId,
          endpoint: usage.endpoint,
          method: usage.method,
          status_code: usage.statusCode,
          ip_address: usage.ipAddress,
          user_agent: usage.userAgent,
          request_size_bytes: usage.requestSizeBytes,
          response_size_bytes: usage.responseSizeBytes,
          response_time_ms: usage.responseTimeMs,
        });
    } catch (error) {
      console.error("Failed to log API key usage:", error);
    }
  }
  
  // Private methods for database operations
  private async createApiKeyInDb(data: {
    teamId: string;
    userId: string;
    name: string;
    hashedToken: string;
    scopes: string[];
    expiresAt: Date;
  }): Promise<Omit<ApiKey, 'token'>> {
    const { data: result, error } = await supabase
      .from("api_keys")
      .insert({
        user_id: data.userId,
        team_id: data.teamId,
        name: data.name,
        key_hash: data.hashedToken,
        key_prefix: "faw_api_",
        scopes: data.scopes,
        expires_at: data.expiresAt.toISOString(),
        is_active: true,
      })
      .select()
      .single();

    if (error) {
      throw new Error(`Failed to create API key: ${error.message}`);
    }

    return {
      id: result.id,
      teamId: result.team_id,
      userId: result.user_id,
      name: result.name,
      hashedToken: result.key_hash,
      scopes: Array.isArray(result.scopes) ? (result.scopes as string[]) : [],
      expiresAt: new Date(result.expires_at!),
      revoked: !result.is_active,
      createdAt: new Date(result.created_at),
      updatedAt: new Date(result.updated_at),
      lastUsedAt: result.last_used_at ? new Date(result.last_used_at) : undefined,
    };
  }
  
  private async getActiveApiKeys(): Promise<ApiKey[]> {
    const { data, error } = await supabase
      .from("api_keys")
      .select(`
        id,
        user_id,
        team_id,
        name,
        key_hash,
        key_prefix,
        scopes,
        last_used_at,
        expires_at,
        is_active,
        created_at,
        updated_at,
        users (id, email, full_name)
      `)
      .eq("is_active", true)
      .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`);

    if (error) {
      console.error("Failed to fetch active API keys:", error);
      return [];
    }

    return data.map((row) => ({
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      name: row.name,
      hashedToken: row.key_hash,
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      expiresAt: new Date(row.expires_at!),
      revoked: !row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      token: "", // Never return actual token
      user: row.users ? {
        id: row.users.id,
        email: row.users.email ?? undefined,
        fullName: row.users.full_name ?? undefined,
      } : undefined,
    }));
  }
  
  private async getApiKeysByTeam(teamId: string): Promise<Omit<ApiKey, 'token' | 'hashedToken'>[]> {
    const { data, error } = await supabase
      .from("api_keys")
      .select(`
        id,
        user_id,
        team_id,
        name,
        scopes,
        last_used_at,
        expires_at,
        is_active,
        created_at,
        updated_at,
        users (id, email, full_name)
      `)
      .eq("team_id", teamId)
      .order("created_at", { ascending: false });

    if (error) {
      throw new Error(`Failed to fetch team API keys: ${error.message}`);
    }

    return data.map((row) => ({
      id: row.id,
      teamId: row.team_id,
      userId: row.user_id,
      name: row.name,
      scopes: Array.isArray(row.scopes) ? (row.scopes as string[]) : [],
      lastUsedAt: row.last_used_at ? new Date(row.last_used_at) : undefined,
      expiresAt: new Date(row.expires_at!),
      revoked: !row.is_active,
      createdAt: new Date(row.created_at),
      updatedAt: new Date(row.updated_at),
      user: row.users ? {
        id: row.users.id,
        email: row.users.email ?? undefined,
        fullName: row.users.full_name ?? undefined,
      } : undefined,
    }));
  }
  
  private async updateApiKeyInDb(apiKeyId: string, updates: Partial<ApiKey>): Promise<void> {
    const dbUpdates: any = {};
    
    if (updates.name) dbUpdates.name = updates.name;
    if (updates.scopes) dbUpdates.scopes = updates.scopes;
    if (updates.revoked !== undefined) dbUpdates.is_active = !updates.revoked;
    
    const { error } = await supabase
      .from("api_keys")
      .update(dbUpdates)
      .eq("id", apiKeyId);

    if (error) {
      throw new Error(`Failed to update API key: ${error.message}`);
    }
  }
  
  private async updateApiKeyLastUsed(apiKeyId: string): Promise<void> {
    const { error } = await supabase
      .from("api_keys")
      .update({ last_used_at: new Date().toISOString() })
      .eq("id", apiKeyId);

    if (error) {
      console.error("Failed to update API key last used:", error);
    }
  }
  
  private updateLastUsedAsync(apiKeyId: string): void {
    // Fire and forget - don't wait for this update
    this.updateApiKeyLastUsed(apiKeyId).catch(error => {
      console.error("Failed to update API key last used:", error);
    });
  }
  
  /**
   * Get cache statistics for monitoring
   */
  getCacheStats() {
    return apiKeyCache.getStats();
  }
}

// Singleton instance
export const apiKeyService = new ApiKeyService();