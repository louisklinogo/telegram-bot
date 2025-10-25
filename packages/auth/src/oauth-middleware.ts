import type { ApiEnv } from "@faworra/api/types/hono-env";
import { createLogger } from "@faworra/middleware/correlation-tracing";
import type { MiddlewareHandler } from "hono";
import { HTTPException } from "hono/http-exception";

// Import OAuth service
import { type OAuthAccessToken, oauthApplicationService } from "./oauth-applications";

/**
 * OAuth Token Validation Middleware
 * Following Midday's exact patterns for OAuth authentication and scope validation
 */

export interface OAuthSession {
  userId: string;
  teamId: string;
  applicationId: string;
  scopes: string[];
  tokenType: "oauth_access_token";
  expiresAt: Date;
  lastUsedAt?: Date;
}

/**
 * Validate OAuth access token
 * Similar to existing JWT auth but for OAuth tokens
 */
export const requireOAuthToken: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization") || c.req.header("Authorization");

  if (!authHeader) {
    throw new HTTPException(401, {
      message: "Authorization header required",
    });
  }

  if (!authHeader.startsWith("Bearer ")) {
    throw new HTTPException(401, {
      message: "Bearer token required",
    });
  }

  const token = authHeader.substring(7);

  if (!token.startsWith("faw_access_token_")) {
    throw new HTTPException(401, {
      message: "Invalid OAuth access token format",
    });
  }

  try {
    // Validate the OAuth access token
    const accessToken = await oauthApplicationService.validateAccessToken(token);

    if (!accessToken) {
      throw new HTTPException(401, {
        message: "Invalid or expired OAuth access token",
      });
    }

    // Create OAuth session
    const oauthSession: OAuthSession = {
      userId: accessToken.userId,
      teamId: accessToken.teamId,
      applicationId: accessToken.applicationId,
      scopes: accessToken.scopes,
      tokenType: "oauth_access_token",
      expiresAt: accessToken.expiresAt,
      lastUsedAt: accessToken.lastUsedAt,
    };

    // Set context for downstream handlers
    c.set("oauthSession", oauthSession);
    c.set("userId", accessToken.userId);
    c.set("teamId", accessToken.teamId);
    c.set("authType", "oauth");

    // Log OAuth request (structured logging)
    const logger = createLogger(c);
    logger.info("OAuth request authenticated", {
      userId: accessToken.userId,
      teamId: accessToken.teamId,
      applicationId: accessToken.applicationId,
      scopes: accessToken.scopes,
    });

    await next();
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    const logger = createLogger(c);
    logger.error("OAuth token validation failed", error);

    throw new HTTPException(401, {
      message: "OAuth token validation failed",
    });
  }
};

/**
 * Require specific OAuth scopes
 * Following Midday's scope-based authorization pattern
 */
export const requireOAuthScopes = (requiredScopes: string[]): MiddlewareHandler<ApiEnv> => {
  return async (c, next) => {
    const oauthSession = c.get("oauthSession") as OAuthSession;

    if (!oauthSession) {
      throw new HTTPException(401, {
        message: "OAuth session not found",
      });
    }

    // Check if token has all required scopes
    const userScopes = oauthSession.scopes || [];
    const missingScopes = requiredScopes.filter((scope) => !userScopes.includes(scope));

    if (missingScopes.length > 0) {
      const logger = createLogger(c);
      logger.warn("OAuth scope validation failed", {
        required: requiredScopes,
        granted: userScopes,
        missing: missingScopes,
        userId: oauthSession.userId,
        applicationId: oauthSession.applicationId,
      });

      throw new HTTPException(403, {
        message: "Insufficient OAuth scopes",
      });
    }

    await next();
  };
};

/**
 * Combined JWT or OAuth authentication middleware
 * Allows endpoints to accept either JWT tokens or OAuth tokens
 * Following Midday's flexible authentication approach
 */
export const requireAuth: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization") || c.req.header("Authorization");

  if (!(authHeader && authHeader.startsWith("Bearer "))) {
    throw new HTTPException(401, {
      message: "Authentication required",
    });
  }

  const token = authHeader.substring(7);

  try {
    // Try OAuth token first
    if (token.startsWith("faw_access_token_")) {
      const accessToken = await oauthApplicationService.validateAccessToken(token);

      if (accessToken) {
        const oauthSession: OAuthSession = {
          userId: accessToken.userId,
          teamId: accessToken.teamId,
          applicationId: accessToken.applicationId,
          scopes: accessToken.scopes,
          tokenType: "oauth_access_token",
          expiresAt: accessToken.expiresAt,
          lastUsedAt: accessToken.lastUsedAt,
        };

        c.set("oauthSession", oauthSession);
        c.set("userId", accessToken.userId);
        c.set("teamId", accessToken.teamId);
        c.set("authType", "oauth");

        return next();
      }
    }

    // Try API key next
    if (token.startsWith("faw_api_")) {
      // TODO: Validate API key using existing API key service
      // const apiKey = await apiKeyService.validateApiKey(token);
      // if (apiKey) { ... set context and continue ... }
    }

    // Try JWT token last
    // TODO: Validate JWT token using existing auth middleware
    // const jwtSession = await validateJWTToken(token);
    // if (jwtSession) { ... set context and continue ... }

    throw new HTTPException(401, {
      message: "Invalid authentication token",
    });
  } catch (error) {
    if (error instanceof HTTPException) {
      throw error;
    }

    const logger = createLogger(c);
    logger.error("Authentication failed", error);

    throw new HTTPException(401, {
      message: "Authentication failed",
    });
  }
};

/**
 * Admin-only OAuth scopes middleware
 * For high-privilege operations
 */
export const requireAdminScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes([
  "admin.read",
  "admin.write",
]);

/**
 * Read-only OAuth scopes middleware
 * For endpoints that only need read access
 */
export const requireReadScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes([
  "profile.read",
  "teams.read",
]);

/**
 * Write scopes middleware
 * For endpoints that modify data
 */
export const requireWriteScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes([
  "profile.write",
  "teams.write",
  "transactions.write",
]);

/**
 * Transaction scopes middleware
 * For transaction-related endpoints
 */
export const requireTransactionScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes([
  "transactions.read",
]);

/**
 * Invoice scopes middleware
 * For invoice-related endpoints
 */
export const requireInvoiceScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes([
  "invoices.read",
]);

/**
 * Reports scopes middleware
 * For report generation endpoints
 */
export const requireReportScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes(["reports.read"]);

/**
 * Files scopes middleware
 * For file upload/download endpoints
 */
export const requireFileScopes: MiddlewareHandler<ApiEnv> = requireOAuthScopes(["files.read"]);

/**
 * OAuth scope validation helper
 * Check if a user has specific scopes without throwing
 */
export const hasOAuthScopes = (c: any, requiredScopes: string[]): boolean => {
  const oauthSession = c.get("oauthSession") as OAuthSession;

  if (!oauthSession) {
    return false;
  }

  const userScopes = oauthSession.scopes || [];
  return requiredScopes.every((scope) => userScopes.includes(scope));
};

/**
 * Get current OAuth session
 * Helper to get OAuth session data in handlers
 */
export const getOAuthSession = (c: any): OAuthSession | null => c.get("oauthSession") || null;

/**
 * OAuth token introspection endpoint handler
 * Allows applications to check token validity and get token info
 */
export const introspectToken: MiddlewareHandler<ApiEnv> = async (c) => {
  const body = await c.req.json();
  const { token, client_id, client_secret } = body;

  try {
    // Validate client credentials
    const application = await oauthApplicationService.validateClientCredentials(
      client_id,
      client_secret
    );

    if (!application) {
      return c.json({
        active: false,
      });
    }

    // Validate the access token
    const accessToken = await oauthApplicationService.validateAccessToken(token);

    if (!accessToken || accessToken.applicationId !== application.id) {
      return c.json({
        active: false,
      });
    }

    // Return token introspection response (RFC 7662)
    return c.json({
      active: true,
      client_id: application.clientId,
      username: accessToken.userId, // User ID as username
      scope: accessToken.scopes.join(" "),
      exp: Math.floor(accessToken.expiresAt.getTime() / 1000),
      iat: Math.floor(accessToken.createdAt.getTime() / 1000),
      sub: accessToken.userId,
      aud: application.clientId,
      iss: "https://api.faworra.com", // TODO: Use actual issuer URL
      token_type: "Bearer",
    });
  } catch (error) {
    const logger = createLogger(c);
    logger.error("Token introspection failed", error);

    return c.json({
      active: false,
    });
  }
};

export default {
  requireOAuthToken,
  requireOAuthScopes,
  requireAuth,
  requireAdminScopes,
  requireReadScopes,
  requireWriteScopes,
  requireTransactionScopes,
  requireInvoiceScopes,
  requireReportScopes,
  requireFileScopes,
  hasOAuthScopes,
  getOAuthSession,
  introspectToken,
};
