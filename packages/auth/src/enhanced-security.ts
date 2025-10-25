import type { ApiEnv } from "@faworra/api/types/hono-env";
import crypto from "crypto";
import type { MiddlewareHandler } from "hono";
import { oauthCache } from "./oauth-redis-cache";

/**
 * Enhanced Security Features
 * Advanced PKCE validation and comprehensive security audit logging
 * Following enterprise security patterns used by production OAuth providers
 */

export interface PKCEValidationOptions {
  enforceForPublicClients?: boolean;
  requireS256Only?: boolean;
  minVerifierLength?: number;
  maxVerifierLength?: number;
  allowedCharacters?: RegExp;
}

export interface SecurityAuditEvent {
  type: SecurityEventType;
  severity: "low" | "medium" | "high" | "critical";
  userId?: string;
  clientId?: string;
  ip?: string;
  userAgent?: string;
  requestId?: string;
  details?: any;
  timestamp?: Date;
  source?: string;
}

export type SecurityEventType =
  | "oauth_authorization_success"
  | "oauth_authorization_failed"
  | "oauth_token_exchange_success"
  | "oauth_token_exchange_failed"
  | "oauth_token_revoked"
  | "csrf_validation_failed"
  | "pkce_validation_failed"
  | "invalid_redirect_uri"
  | "suspicious_request_pattern"
  | "rate_limit_exceeded"
  | "api_key_compromised"
  | "client_secret_compromised"
  | "brute_force_attempt"
  | "account_lockout"
  | "privilege_escalation_attempt"
  | "data_breach_attempt";

const DEFAULT_PKCE_OPTIONS: Required<PKCEValidationOptions> = {
  enforceForPublicClients: true,
  requireS256Only: true,
  minVerifierLength: 43,
  maxVerifierLength: 128,
  allowedCharacters: /^[A-Za-z0-9\-._~]+$/,
};

/**
 * Enhanced PKCE Validator
 * Implements strict validation following RFC 7636 with additional security measures
 */
export class EnhancedPKCEValidator {
  private options: Required<PKCEValidationOptions>;

  constructor(options: Partial<PKCEValidationOptions> = {}) {
    this.options = { ...DEFAULT_PKCE_OPTIONS, ...options };
  }

  /**
   * Validate PKCE parameters with enhanced security checks
   */
  validatePKCEFlow(params: {
    codeVerifier: string;
    codeChallenge: string;
    codeChallengeMethod: string;
    isPublicClient?: boolean;
  }): {
    valid: boolean;
    reason?: string;
    securityRisk?: "low" | "medium" | "high";
  } {
    const { codeVerifier, codeChallenge, codeChallengeMethod, isPublicClient = false } = params;

    // Enforce PKCE for public clients
    if (
      isPublicClient &&
      this.options.enforceForPublicClients &&
      !(codeVerifier && codeChallenge)
    ) {
      return {
        valid: false,
        reason: "PKCE required for public clients",
        securityRisk: "high",
      };
    }

    // Validate code challenge method
    if (this.options.requireS256Only && codeChallengeMethod !== "S256") {
      return {
        valid: false,
        reason: "Only S256 code challenge method allowed",
        securityRisk: "medium",
      };
    }

    // Validate code verifier format
    const verifierValidation = this.validateCodeVerifier(codeVerifier);
    if (!verifierValidation.valid) {
      return verifierValidation;
    }

    // Validate code challenge
    const challengeValidation = this.validateCodeChallenge(
      codeChallenge,
      codeVerifier,
      codeChallengeMethod
    );
    if (!challengeValidation.valid) {
      return challengeValidation;
    }

    // Check for potential security weaknesses
    const securityCheck = this.performSecurityCheck(codeVerifier);

    return {
      valid: true,
      securityRisk: securityCheck.risk,
    };
  }

  /**
   * Validate code verifier according to RFC 7636
   */
  private validateCodeVerifier(codeVerifier: string): {
    valid: boolean;
    reason?: string;
    securityRisk?: "low" | "medium" | "high";
  } {
    if (!codeVerifier) {
      return { valid: false, reason: "Code verifier is required", securityRisk: "high" };
    }

    // Check length requirements
    if (codeVerifier.length < this.options.minVerifierLength) {
      return {
        valid: false,
        reason: `Code verifier too short (minimum ${this.options.minVerifierLength} characters)`,
        securityRisk: "high",
      };
    }

    if (codeVerifier.length > this.options.maxVerifierLength) {
      return {
        valid: false,
        reason: `Code verifier too long (maximum ${this.options.maxVerifierLength} characters)`,
        securityRisk: "low",
      };
    }

    // Check allowed characters
    if (!this.options.allowedCharacters.test(codeVerifier)) {
      return {
        valid: false,
        reason: "Code verifier contains invalid characters",
        securityRisk: "medium",
      };
    }

    return { valid: true };
  }

  /**
   * Validate code challenge matches verifier
   */
  private validateCodeChallenge(
    codeChallenge: string,
    codeVerifier: string,
    method: string
  ): {
    valid: boolean;
    reason?: string;
    securityRisk?: "low" | "medium" | "high";
  } {
    if (!codeChallenge) {
      return { valid: false, reason: "Code challenge is required", securityRisk: "high" };
    }

    let expectedChallenge: string;

    switch (method) {
      case "plain":
        expectedChallenge = codeVerifier;
        break;
      case "S256":
        expectedChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");
        break;
      default:
        return {
          valid: false,
          reason: `Unsupported code challenge method: ${method}`,
          securityRisk: "high",
        };
    }

    // Use constant-time comparison to prevent timing attacks
    if (!this.constantTimeEquals(codeChallenge, expectedChallenge)) {
      return {
        valid: false,
        reason: "Code challenge does not match verifier",
        securityRisk: "high",
      };
    }

    return { valid: true };
  }

  /**
   * Perform additional security checks on code verifier
   */
  private performSecurityCheck(codeVerifier: string): {
    risk: "low" | "medium" | "high";
    issues: string[];
  } {
    const issues: string[] = [];
    let risk: "low" | "medium" | "high" = "low";

    // Check for insufficient entropy
    const uniqueChars = new Set(codeVerifier).size;
    const entropyRatio = uniqueChars / codeVerifier.length;

    if (entropyRatio < 0.3) {
      issues.push("Low entropy detected");
      risk = "medium";
    }

    // Check for common patterns
    const commonPatterns = [
      /(.)\1{4,}/, // Repeated characters
      /^[a-z]+$/, // Only lowercase
      /^[A-Z]+$/, // Only uppercase
      /^[0-9]+$/, // Only numbers
      /^(abc|123|qwe|test|demo)/i, // Common prefixes
    ];

    for (const pattern of commonPatterns) {
      if (pattern.test(codeVerifier)) {
        issues.push("Weak pattern detected");
        risk = "medium";
        break;
      }
    }

    // Check for dictionary words (basic check)
    const commonWords = ["password", "secret", "token", "key", "admin", "user"];
    const lowerVerifier = codeVerifier.toLowerCase();

    for (const word of commonWords) {
      if (lowerVerifier.includes(word)) {
        issues.push("Contains dictionary word");
        risk = "medium";
        break;
      }
    }

    return { risk, issues };
  }

  /**
   * Constant-time string comparison to prevent timing attacks
   */
  private constantTimeEquals(a: string, b: string): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a.charCodeAt(i) ^ b.charCodeAt(i);
    }

    return result === 0;
  }

  /**
   * Generate cryptographically secure code verifier
   */
  generateSecureCodeVerifier(): string {
    const randomBytes = crypto.randomBytes(64);
    return randomBytes.toString("base64url").substring(0, 128);
  }

  /**
   * Generate code challenge from verifier
   */
  generateCodeChallenge(codeVerifier: string, method: "S256" | "plain" = "S256"): string {
    switch (method) {
      case "plain":
        return codeVerifier;
      case "S256":
        return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
      default:
        throw new Error(`Unsupported code challenge method: ${method}`);
    }
  }
}

/**
 * Security Audit Logger
 * Comprehensive security event logging with multiple storage backends
 */
export class SecurityAuditLogger {
  private eventQueue: SecurityAuditEvent[] = [];
  private flushTimer: NodeJS.Timeout | null = null;
  private readonly batchSize = 100;
  private readonly flushInterval = 30_000; // 30 seconds

  constructor() {
    // Start periodic flushing
    this.startPeriodicFlush();

    // Flush on process exit
    process.on("beforeExit", () => {
      this.flush();
    });
  }

  /**
   * Log security event
   */
  async logEvent(event: Omit<SecurityAuditEvent, "timestamp">): Promise<void> {
    const auditEvent: SecurityAuditEvent = {
      ...event,
      timestamp: new Date(),
      source: "faworra-oauth-server",
    };

    // Add to queue for batch processing
    this.eventQueue.push(auditEvent);

    // Immediate flush for critical events
    if (event.severity === "critical") {
      await this.flush();
    }

    // Flush if queue is full
    if (this.eventQueue.length >= this.batchSize) {
      await this.flush();
    }
  }

  /**
   * Log OAuth authorization events
   */
  async logOAuthAuthorization(params: {
    success: boolean;
    clientId: string;
    userId?: string;
    scopes?: string[];
    redirectUri?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    error?: string;
  }): Promise<void> {
    const { success, clientId, userId, scopes, redirectUri, ip, userAgent, requestId, error } =
      params;

    await this.logEvent({
      type: success ? "oauth_authorization_success" : "oauth_authorization_failed",
      severity: success ? "low" : "medium",
      clientId,
      userId,
      ip,
      userAgent,
      requestId,
      details: {
        scopes,
        redirectUri,
        error,
      },
    });
  }

  /**
   * Log OAuth token exchange events
   */
  async logTokenExchange(params: {
    success: boolean;
    clientId: string;
    grantType: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    error?: string;
  }): Promise<void> {
    const { success, clientId, grantType, userId, ip, userAgent, requestId, error } = params;

    await this.logEvent({
      type: success ? "oauth_token_exchange_success" : "oauth_token_exchange_failed",
      severity: success ? "low" : grantType === "client_credentials" ? "high" : "medium",
      clientId,
      userId,
      ip,
      userAgent,
      requestId,
      details: {
        grantType,
        error,
      },
    });
  }

  /**
   * Log CSRF validation failures
   */
  async logCSRFViolation(params: {
    clientId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    stateToken?: string;
    expectedState?: string;
  }): Promise<void> {
    await this.logEvent({
      type: "csrf_validation_failed",
      severity: "high",
      ...params,
      details: {
        stateToken: params.stateToken,
        expectedState: params.expectedState,
      },
    });
  }

  /**
   * Log PKCE validation failures
   */
  async logPKCEViolation(params: {
    clientId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    reason?: string;
    securityRisk?: string;
  }): Promise<void> {
    await this.logEvent({
      type: "pkce_validation_failed",
      severity: "high",
      ...params,
      details: {
        reason: params.reason,
        securityRisk: params.securityRisk,
      },
    });
  }

  /**
   * Log suspicious activity patterns
   */
  async logSuspiciousActivity(params: {
    pattern: string;
    clientId?: string;
    userId?: string;
    ip?: string;
    userAgent?: string;
    requestId?: string;
    details?: any;
  }): Promise<void> {
    await this.logEvent({
      type: "suspicious_request_pattern",
      severity: "medium",
      ...params,
      details: {
        pattern: params.pattern,
        ...params.details,
      },
    });
  }

  /**
   * Log rate limiting events
   */
  async logRateLimitExceeded(params: {
    endpoint: string;
    identifier: string;
    limit: number;
    attempts: number;
    ip?: string;
    userAgent?: string;
    requestId?: string;
  }): Promise<void> {
    await this.logEvent({
      type: "rate_limit_exceeded",
      severity: params.attempts > params.limit * 2 ? "high" : "medium",
      ip: params.ip,
      userAgent: params.userAgent,
      requestId: params.requestId,
      details: {
        endpoint: params.endpoint,
        identifier: params.identifier,
        limit: params.limit,
        attempts: params.attempts,
      },
    });
  }

  /**
   * Flush queued events to storage
   */
  private async flush(): Promise<void> {
    if (this.eventQueue.length === 0) return;

    const events = [...this.eventQueue];
    this.eventQueue = [];

    try {
      // Store in Redis for immediate access
      await this.storeInRedis(events);

      // Log to console for development
      if (process.env.NODE_ENV !== "production") {
        this.logToConsole(events);
      }

      // In production, you would also store in:
      // - Database for long-term storage
      // - External SIEM system
      // - Security monitoring service
      // await this.storeInDatabase(events);
      // await this.sendToSIEM(events);
    } catch (error) {
      console.error("Failed to flush security events:", error);
      // Re-queue events on failure (with limit to prevent memory issues)
      if (this.eventQueue.length < 1000) {
        this.eventQueue.unshift(...events);
      }
    }
  }

  /**
   * Store events in Redis
   */
  private async storeInRedis(events: SecurityAuditEvent[]): Promise<void> {
    for (const event of events) {
      await oauthCache.logSecurityEvent({
        type: event.type,
        userId: event.userId,
        clientId: event.clientId,
        ip: event.ip,
        userAgent: event.userAgent,
        details: {
          ...event.details,
          severity: event.severity,
          requestId: event.requestId,
          timestamp: event.timestamp?.toISOString(),
        },
      });
    }
  }

  /**
   * Log events to console for development
   */
  private logToConsole(events: SecurityAuditEvent[]): void {
    events.forEach((event) => {
      const logLevel =
        event.severity === "critical" || event.severity === "high" ? "error" : "warn";
      console[logLevel](`[SECURITY AUDIT] ${event.type}:`, {
        severity: event.severity,
        clientId: event.clientId,
        userId: event.userId,
        ip: event.ip,
        timestamp: event.timestamp,
        details: event.details,
      });
    });
  }

  /**
   * Start periodic flush timer
   */
  private startPeriodicFlush(): void {
    this.flushTimer = setInterval(() => {
      this.flush().catch((error) => {
        console.error("Periodic flush failed:", error);
      });
    }, this.flushInterval);
  }
}

/**
 * Security middleware for enhanced OAuth protection
 */
export const enhancedSecurityMiddleware = (
  options: {
    pkceOptions?: Partial<PKCEValidationOptions>;
    enableSuspiciousActivityDetection?: boolean;
    enableBehavioralAnalysis?: boolean;
  } = {}
): MiddlewareHandler<ApiEnv> => {
  const pkceValidator = new EnhancedPKCEValidator(options.pkceOptions);
  const auditLogger = new SecurityAuditLogger();

  return async (c, next) => {
    const startTime = Date.now();
    const requestId = c.get("requestId") || "unknown";
    const ip = c.req.header("CF-Connecting-IP") || c.req.header("X-Forwarded-For") || "unknown";
    const userAgent = c.req.header("User-Agent") || "unknown";

    try {
      // Detect suspicious patterns before processing
      if (options.enableSuspiciousActivityDetection) {
        const suspiciousCheck = await detectSuspiciousActivity(c, { ip, userAgent, requestId });
        if (suspiciousCheck.suspicious) {
          await auditLogger.logSuspiciousActivity({
            pattern: suspiciousCheck.pattern,
            ip,
            userAgent,
            requestId,
            details: suspiciousCheck.details,
          });

          // For critical patterns, block the request
          if (suspiciousCheck.severity === "critical") {
            return c.json(
              {
                error: "request_blocked",
                error_description: "Request blocked due to suspicious activity",
              },
              403
            );
          }
        }
      }

      await next();

      // Log successful request processing
      const processingTime = Date.now() - startTime;
      if (processingTime > 5000) {
        // Log slow requests
        await auditLogger.logEvent({
          type: "suspicious_request_pattern",
          severity: "low",
          ip,
          userAgent,
          requestId,
          details: {
            pattern: "slow_request",
            processingTime,
            path: c.req.path,
          },
        });
      }
    } catch (error) {
      // Log error with context
      await auditLogger.logEvent({
        type: "oauth_authorization_failed",
        severity: "medium",
        ip,
        userAgent,
        requestId,
        details: {
          error: error instanceof Error ? error.message : "Unknown error",
          path: c.req.path,
          method: c.req.method,
        },
      });

      throw error;
    }
  };
};

/**
 * Detect suspicious activity patterns
 */
async function detectSuspiciousActivity(
  c: any,
  context: {
    ip: string;
    userAgent: string;
    requestId: string;
  }
): Promise<{
  suspicious: boolean;
  pattern?: string;
  severity?: "low" | "medium" | "high" | "critical";
  details?: any;
}> {
  const { ip, userAgent } = context;

  // Check for common attack patterns
  const suspiciousPatterns = [
    { pattern: /bot|crawler|spider/i, test: userAgent, severity: "low" as const },
    { pattern: /sqlmap|nikto|nmap|masscan/i, test: userAgent, severity: "high" as const },
    { pattern: /<script|javascript:|vbscript:/i, test: c.req.url, severity: "high" as const },
    { pattern: /\.\.\//g, test: c.req.url, severity: "medium" as const },
  ];

  for (const { pattern, test, severity } of suspiciousPatterns) {
    if (pattern.test(test)) {
      return {
        suspicious: true,
        pattern: pattern.source,
        severity,
        details: { matchedValue: test },
      };
    }
  }

  // Check rate limiting data for abuse patterns
  const rateLimitData = await oauthCache.checkRateLimit(ip, 60_000, 100); // 100 requests per minute
  if (!rateLimitData.allowed && rateLimitData.totalAttempts > 200) {
    return {
      suspicious: true,
      pattern: "excessive_requests",
      severity: "critical",
      details: { attempts: rateLimitData.totalAttempts },
    };
  }

  return { suspicious: false };
}

/**
 * Default instances
 */
export const pkceValidator = new EnhancedPKCEValidator();
export const securityAuditLogger = new SecurityAuditLogger();

export default {
  EnhancedPKCEValidator,
  SecurityAuditLogger,
  pkceValidator,
  securityAuditLogger,
  enhancedSecurityMiddleware,
};
