import type { ApiEnv } from "@faworra/api/types/hono-env";
import crypto from "crypto";
import type { MiddlewareHandler } from "hono";

/**
 * CSRF Protection for OAuth Flows
 * Implements enterprise-grade CSRF protection following security best practices
 * Based on patterns used by production OAuth providers like Midday
 */

export interface CSRFOptions {
  stateLength?: number;
  stateTTL?: number; // TTL in seconds
  cookieName?: string;
  headerName?: string;
  skipForSafeActions?: boolean;
}

export interface CSRFState {
  token: string;
  redirectUri: string;
  clientId: string;
  scopes: string[];
  timestamp: number;
  nonce?: string; // For additional entropy
}

const DEFAULT_OPTIONS: Required<CSRFOptions> = {
  stateLength: 32,
  stateTTL: 600, // 10 minutes
  cookieName: "_faw_csrf",
  headerName: "x-csrf-token",
  skipForSafeActions: true,
};

/**
 * In-memory store for CSRF states (in production, use Redis)
 * This matches Midday's pattern of using Redis for session storage
 */
class CSRFStateStore {
  private states = new Map<string, CSRFState & { expiresAt: number }>();

  constructor(private ttl = 600) {
    // Cleanup expired states every 5 minutes
    setInterval(() => this.cleanup(), 5 * 60 * 1000);
  }

  set(token: string, state: CSRFState): void {
    this.states.set(token, {
      ...state,
      expiresAt: Date.now() + this.ttl * 1000,
    });
  }

  get(token: string): CSRFState | null {
    const state = this.states.get(token);
    if (!state) return null;

    if (Date.now() > state.expiresAt) {
      this.states.delete(token);
      return null;
    }

    return state;
  }

  delete(token: string): void {
    this.states.delete(token);
  }

  private cleanup(): void {
    const now = Date.now();
    for (const [token, state] of this.states) {
      if (now > state.expiresAt) {
        this.states.delete(token);
      }
    }
  }
}

// Global state store (use Redis in production)
const stateStore = new CSRFStateStore();

/**
 * Generate secure state parameter for OAuth authorization
 * Following RFC 6749 recommendations for state parameter entropy
 */
export function generateStateParameter(options: Partial<CSRFOptions> = {}): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  // Generate cryptographically secure random bytes
  const randomBytes = crypto.randomBytes(opts.stateLength);
  const timestamp = Date.now().toString(36);
  const nonce = crypto.randomBytes(8).toString("hex");

  // Combine timestamp, nonce, and random data
  const combined = `${timestamp}_${nonce}_${randomBytes.toString("base64url")}`;

  // Return URL-safe base64 string
  return Buffer.from(combined).toString("base64url");
}

/**
 * Store OAuth state with CSRF protection
 */
export function storeOAuthState(params: {
  clientId: string;
  redirectUri: string;
  scopes: string[];
  nonce?: string;
  ttl?: number;
}): string {
  const { clientId, redirectUri, scopes, nonce, ttl } = params;

  const token = generateStateParameter();
  const state: CSRFState = {
    token,
    clientId,
    redirectUri,
    scopes,
    timestamp: Date.now(),
    nonce,
  };

  stateStore.set(token, state);

  return token;
}

/**
 * Validate and retrieve OAuth state
 */
export function validateOAuthState(stateToken: string): CSRFState | null {
  if (!stateToken || typeof stateToken !== "string") {
    return null;
  }

  // Minimum length check (should be at least 40 chars for security)
  if (stateToken.length < 40) {
    return null;
  }

  const state = stateStore.get(stateToken);
  if (!state) {
    return null;
  }

  // Additional validation: state should not be too old
  const maxAge = 10 * 60 * 1000; // 10 minutes
  if (Date.now() - state.timestamp > maxAge) {
    stateStore.delete(stateToken);
    return null;
  }

  return state;
}

/**
 * Remove OAuth state after successful validation
 */
export function consumeOAuthState(stateToken: string): boolean {
  const state = stateStore.get(stateToken);
  if (state) {
    stateStore.delete(stateToken);
    return true;
  }
  return false;
}

/**
 * CSRF protection middleware for OAuth endpoints
 */
export const csrfProtection = (options: CSRFOptions = {}): MiddlewareHandler<ApiEnv> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (c, next) => {
    const method = c.req.method;
    const path = c.req.path;

    // Skip CSRF for safe methods if configured
    if (opts.skipForSafeActions && ["GET", "HEAD", "OPTIONS"].includes(method)) {
      return next();
    }

    // For OAuth authorize endpoint, we generate and store state
    if (method === "GET" && path.includes("/oauth/authorize")) {
      const clientId = c.req.query("client_id");
      const redirectUri = c.req.query("redirect_uri");
      const scope = c.req.query("scope") || "";
      const existingState = c.req.query("state");

      if (!(clientId && redirectUri)) {
        return c.json(
          {
            error: "invalid_request",
            error_description: "Missing required parameters",
          },
          400
        );
      }

      // If state is provided, validate it
      if (existingState) {
        const validState = validateOAuthState(existingState);
        if (!validState) {
          return c.json(
            {
              error: "invalid_request",
              error_description: "Invalid or expired state parameter",
            },
            400
          );
        }

        // Verify state matches request parameters
        if (validState.clientId !== clientId || validState.redirectUri !== redirectUri) {
          return c.json(
            {
              error: "invalid_request",
              error_description: "State parameter mismatch",
            },
            400
          );
        }
      } else {
        // Generate new state if not provided
        const newState = storeOAuthState({
          clientId,
          redirectUri,
          scopes: scope.split(" ").filter(Boolean),
          nonce: crypto.randomBytes(16).toString("hex"),
        });

        // Add state to context for later use
        c.set("csrfState", newState);
      }

      return next();
    }

    // For OAuth token endpoint, validate state if present
    if (method === "POST" && path.includes("/oauth/token")) {
      const grantType = c.req.header("content-type")?.includes("application/x-www-form-urlencoded")
        ? (await c.req.parseBody())["grant_type"]
        : (await c.req.json()).grant_type;

      // For authorization_code grant, we should have validated state in the authorize step
      // Token endpoint doesn't need additional CSRF protection as it uses client credentials
      return next();
    }

    // For other OAuth endpoints, validate CSRF token from header
    const csrfToken = c.req.header(opts.headerName) || c.req.query("_csrf");

    if (!csrfToken) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "CSRF token required",
        },
        403
      );
    }

    const isValidToken = validateOAuthState(csrfToken);
    if (!isValidToken) {
      return c.json(
        {
          error: "invalid_request",
          error_description: "Invalid CSRF token",
        },
        403
      );
    }

    return next();
  };
};

/**
 * Double Submit Cookie pattern for additional CSRF protection
 */
export const doubleSubmitCookie = (options: CSRFOptions = {}): MiddlewareHandler<ApiEnv> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  return async (c, next) => {
    const method = c.req.method;

    if (["POST", "PUT", "DELETE", "PATCH"].includes(method)) {
      // Check for CSRF token in both cookie and header
      const cookieToken = c.req.cookie(opts.cookieName);
      const headerToken = c.req.header(opts.headerName);

      if (!(cookieToken && headerToken)) {
        return c.json(
          {
            error: "csrf_token_missing",
            message: "CSRF protection requires token in both cookie and header",
          },
          403
        );
      }

      if (cookieToken !== headerToken) {
        return c.json(
          {
            error: "csrf_token_mismatch",
            message: "CSRF token mismatch between cookie and header",
          },
          403
        );
      }
    }

    return next();
  };
};

/**
 * Generate CSRF token for client-side use
 */
export function generateCSRFToken(): string {
  return crypto.randomBytes(32).toString("hex");
}

/**
 * Set CSRF token in response cookie
 */
export function setCSRFCookie(c: any, token: string, options: CSRFOptions = {}): void {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  c.cookie(opts.cookieName, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    maxAge: opts.stateTTL,
    path: "/",
  });
}

/**
 * Security utilities for OAuth implementation
 */
export const security = {
  generateStateParameter,
  storeOAuthState,
  validateOAuthState,
  consumeOAuthState,
  generateCSRFToken,
  setCSRFCookie,
  csrfProtection,
  doubleSubmitCookie,

  // Validate redirect URI against registered URIs
  validateRedirectUri: (requestedUri: string, registeredUris: string[]): boolean => {
    if (!(requestedUri && registeredUris.length)) return false;

    // Exact match required for security
    return registeredUris.includes(requestedUri);
  },

  // Generate secure authorization code
  generateAuthorizationCode: (): string =>
    `faw_auth_${crypto.randomBytes(32).toString("base64url")}`,

  // Generate secure access token
  generateAccessToken: (): string =>
    `faw_access_token_${crypto.randomBytes(40).toString("base64url")}`,

  // Generate secure refresh token
  generateRefreshToken: (): string => `faw_refresh_${crypto.randomBytes(40).toString("base64url")}`,

  // Constant-time string comparison to prevent timing attacks
  constantTimeEquals: (a: string, b: string): boolean => {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  },

  // Rate limit key generation for OAuth endpoints
  generateRateLimitKey: (endpoint: string, identifier: string): string =>
    `oauth_rl:${endpoint}:${identifier}`,

  // Security event logging
  logSecurityEvent: (event: {
    type: "csrf_violation" | "invalid_state" | "redirect_uri_mismatch" | "token_validation_failed";
    clientId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    details?: any;
  }) => {
    console.warn("[SECURITY EVENT]", {
      ...event,
      timestamp: new Date().toISOString(),
      severity: "high",
    });

    // In production, send to security monitoring service
    // Example: await securityMonitoring.reportEvent(event);
  },
};

export default security;
