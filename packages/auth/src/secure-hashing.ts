import bcrypt from "bcryptjs";
import crypto from "crypto";

/**
 * Enhanced Token Hashing & Cryptography
 * Enterprise-grade security implementations following industry best practices
 * Based on patterns used by production systems like Midday
 */

export interface HashingOptions {
  saltRounds?: number;
  algorithm?: string;
  keyDerivationIterations?: number;
  keyLength?: number;
  pepper?: string; // Additional secret for API keys
}

const DEFAULT_OPTIONS: Required<HashingOptions> = {
  saltRounds: 12, // Bcrypt rounds (2^12 = 4096 iterations)
  algorithm: "sha256",
  keyDerivationIterations: 100_000, // PBKDF2 iterations
  keyLength: 64,
  pepper: process.env.FAWORRA_HASH_PEPPER || "faw_default_pepper_change_in_production",
};

/**
 * Enhanced bcrypt implementation with additional security layers
 * Following Midday's patterns for secure password/token hashing
 */
export class SecureHasher {
  private options: Required<HashingOptions>;

  constructor(options: Partial<HashingOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };

    // Warn if using default pepper in production
    if (process.env.NODE_ENV === "production" && this.options.pepper === DEFAULT_OPTIONS.pepper) {
      console.warn(
        "[SECURITY WARNING] Using default pepper in production. Set FAWORRA_HASH_PEPPER environment variable."
      );
    }
  }

  /**
   * Hash API keys with bcrypt + pepper for maximum security
   * API keys need to be verified frequently, so we use bcrypt with reasonable rounds
   */
  async hashApiKey(apiKey: string): Promise<string> {
    if (!(apiKey && apiKey.startsWith("faw_api_"))) {
      throw new Error("Invalid API key format");
    }

    // Add pepper before hashing to prevent rainbow table attacks
    const pepperedKey = this.addPepper(apiKey);

    // Use bcrypt with configured salt rounds
    const hash = await bcrypt.hash(pepperedKey, this.options.saltRounds);

    return hash;
  }

  /**
   * Verify API key against stored hash
   */
  async verifyApiKey(apiKey: string, storedHash: string): Promise<boolean> {
    try {
      if (!(apiKey && apiKey.startsWith("faw_api_"))) {
        return false;
      }

      const pepperedKey = this.addPepper(apiKey);
      return await bcrypt.compare(pepperedKey, storedHash);
    } catch (error) {
      console.error("API key verification error:", error);
      return false;
    }
  }

  /**
   * Hash OAuth client secrets with high security requirements
   * Client secrets are verified less frequently, so we can use more iterations
   */
  async hashClientSecret(clientSecret: string): Promise<string> {
    if (!(clientSecret && clientSecret.startsWith("faw_secret_"))) {
      throw new Error("Invalid client secret format");
    }

    // Use PBKDF2 with high iteration count for client secrets
    return new Promise((resolve, reject) => {
      const salt = crypto.randomBytes(32);
      const pepperedSecret = this.addPepper(clientSecret);

      crypto.pbkdf2(
        pepperedSecret,
        salt,
        this.options.keyDerivationIterations,
        this.options.keyLength,
        this.options.algorithm,
        (err, derivedKey) => {
          if (err) {
            reject(err);
            return;
          }

          // Combine salt and derived key for storage
          const combined = Buffer.concat([salt, derivedKey]);
          resolve(combined.toString("base64"));
        }
      );
    });
  }

  /**
   * Verify client secret against stored hash
   */
  async verifyClientSecret(clientSecret: string, storedHash: string): Promise<boolean> {
    try {
      if (!(clientSecret && clientSecret.startsWith("faw_secret_"))) {
        return false;
      }

      const combined = Buffer.from(storedHash, "base64");
      const salt = combined.subarray(0, 32);
      const storedKey = combined.subarray(32);

      const pepperedSecret = this.addPepper(clientSecret);

      return new Promise((resolve) => {
        crypto.pbkdf2(
          pepperedSecret,
          salt,
          this.options.keyDerivationIterations,
          this.options.keyLength,
          this.options.algorithm,
          (err, derivedKey) => {
            if (err) {
              resolve(false);
              return;
            }

            // Use constant-time comparison
            resolve(this.constantTimeEquals(derivedKey, storedKey));
          }
        );
      });
    } catch (error) {
      console.error("Client secret verification error:", error);
      return false;
    }
  }

  /**
   * Hash OAuth access tokens for storage
   * We need fast verification, so use SHA-256 with pepper
   */
  hashAccessToken(accessToken: string): string {
    if (!(accessToken && accessToken.startsWith("faw_access_token_"))) {
      throw new Error("Invalid access token format");
    }

    const pepperedToken = this.addPepper(accessToken);
    return crypto.createHash("sha256").update(pepperedToken).digest("hex");
  }

  /**
   * Hash OAuth refresh tokens for storage
   */
  hashRefreshToken(refreshToken: string): string {
    if (!(refreshToken && refreshToken.startsWith("faw_refresh_"))) {
      throw new Error("Invalid refresh token format");
    }

    const pepperedToken = this.addPepper(refreshToken);
    return crypto.createHash("sha256").update(pepperedToken).digest("hex");
  }

  /**
   * Hash authorization codes for storage
   */
  hashAuthorizationCode(authCode: string): string {
    if (!(authCode && authCode.startsWith("faw_auth_"))) {
      throw new Error("Invalid authorization code format");
    }

    const pepperedCode = this.addPepper(authCode);
    return crypto.createHash("sha256").update(pepperedCode).digest("hex");
  }

  /**
   * Generate secure random tokens with proper entropy
   */
  generateSecureToken(prefix: string, length = 40): string {
    const randomBytes = crypto.randomBytes(length);
    return `${prefix}${randomBytes.toString("base64url")}`;
  }

  /**
   * Add pepper to prevent rainbow table attacks
   */
  private addPepper(value: string): string {
    return `${value}:${this.options.pepper}`;
  }

  /**
   * Constant-time comparison to prevent timing attacks
   */
  private constantTimeEquals(a: Buffer, b: Buffer): boolean {
    if (a.length !== b.length) return false;

    let result = 0;
    for (let i = 0; i < a.length; i++) {
      result |= a[i] ^ b[i];
    }

    return result === 0;
  }
}

/**
 * Token generators with cryptographic security
 */
export class SecureTokenGenerator {
  /**
   * Generate cryptographically secure API key
   */
  static generateApiKey(): string {
    const timestamp = Date.now().toString(36);
    const randomBytes = crypto.randomBytes(32);
    const entropy = crypto.randomBytes(8).toString("hex");

    return `faw_api_${timestamp}_${entropy}_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate cryptographically secure client ID
   */
  static generateClientId(): string {
    const randomBytes = crypto.randomBytes(24);
    return `faw_client_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate cryptographically secure client secret
   */
  static generateClientSecret(): string {
    const randomBytes = crypto.randomBytes(48);
    return `faw_secret_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate authorization code with short expiry
   */
  static generateAuthorizationCode(): string {
    const randomBytes = crypto.randomBytes(32);
    return `faw_auth_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate access token with proper entropy
   */
  static generateAccessToken(): string {
    const randomBytes = crypto.randomBytes(40);
    return `faw_access_token_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate refresh token with high entropy
   */
  static generateRefreshToken(): string {
    const randomBytes = crypto.randomBytes(48);
    return `faw_refresh_${randomBytes.toString("base64url")}`;
  }

  /**
   * Generate PKCE code verifier
   */
  static generateCodeVerifier(): string {
    const randomBytes = crypto.randomBytes(32);
    return randomBytes.toString("base64url");
  }

  /**
   * Generate PKCE code challenge from verifier
   */
  static generateCodeChallenge(codeVerifier: string): string {
    return crypto.createHash("sha256").update(codeVerifier).digest("base64url");
  }
}

/**
 * Security validation utilities
 */
export class SecurityValidator {
  /**
   * Validate token format and entropy
   */
  static validateTokenFormat(token: string, expectedPrefix: string): boolean {
    if (!token || typeof token !== "string") return false;
    if (!token.startsWith(expectedPrefix)) return false;

    // Ensure minimum length for security
    const minLength = expectedPrefix.length + 40; // Prefix + minimum random data
    if (token.length < minLength) return false;

    // Check for valid base64url characters after prefix
    const tokenPart = token.substring(expectedPrefix.length);
    const validChars = /^[A-Za-z0-9_-]+$/;
    return validChars.test(tokenPart);
  }

  /**
   * Validate PKCE parameters
   */
  static validatePKCE(codeVerifier: string, codeChallenge: string, method = "S256"): boolean {
    if (!(codeVerifier && codeChallenge)) return false;

    // Verify code verifier format (43-128 chars, base64url)
    if (codeVerifier.length < 43 || codeVerifier.length > 128) return false;
    if (!/^[A-Za-z0-9_-]+$/.test(codeVerifier)) return false;

    // Only support S256 method for security
    if (method !== "S256") return false;

    // Verify challenge matches verifier
    const expectedChallenge = crypto.createHash("sha256").update(codeVerifier).digest("base64url");

    return expectedChallenge === codeChallenge;
  }

  /**
   * Validate redirect URI security
   */
  static validateRedirectURI(uri: string): { valid: boolean; reason?: string } {
    if (!uri) return { valid: false, reason: "URI is required" };

    try {
      const url = new URL(uri);

      // Must be HTTPS in production (except localhost for development)
      if (
        process.env.NODE_ENV === "production" &&
        url.protocol !== "https:" &&
        url.hostname !== "localhost"
      ) {
        return { valid: false, reason: "HTTPS required in production" };
      }

      // No fragments allowed for security
      if (url.hash) {
        return { valid: false, reason: "Fragment not allowed in redirect URI" };
      }

      // Validate hostname isn't suspicious
      const suspiciousPatterns = [
        /localhost\..*\.(com|org|net)/, // Suspicious localhost domains
        /\b\d{1,3}\.\d{1,3}\.\d{1,3}\.\d{1,3}\b/, // Raw IP addresses (in production)
      ];

      if (process.env.NODE_ENV === "production") {
        for (const pattern of suspiciousPatterns) {
          if (pattern.test(url.hostname)) {
            return { valid: false, reason: "Suspicious hostname detected" };
          }
        }
      }

      return { valid: true };
    } catch (error) {
      return { valid: false, reason: "Invalid URI format" };
    }
  }

  /**
   * Rate limit validation
   */
  static shouldRateLimit(attempts: number, window: number, limit: number): boolean {
    return attempts >= limit;
  }
}

/**
 * Default secure hasher instance
 */
export const secureHasher = new SecureHasher();

/**
 * Convenience functions using default hasher
 */
export const hashApiKey = (apiKey: string) => secureHasher.hashApiKey(apiKey);
export const verifyApiKey = (apiKey: string, hash: string) =>
  secureHasher.verifyApiKey(apiKey, hash);
export const hashClientSecret = (secret: string) => secureHasher.hashClientSecret(secret);
export const verifyClientSecret = (secret: string, hash: string) =>
  secureHasher.verifyClientSecret(secret, hash);
export const hashAccessToken = (token: string) => secureHasher.hashAccessToken(token);
export const hashRefreshToken = (token: string) => secureHasher.hashRefreshToken(token);
export const hashAuthorizationCode = (code: string) => secureHasher.hashAuthorizationCode(code);

export default {
  SecureHasher,
  SecureTokenGenerator,
  SecurityValidator,
  secureHasher,
  hashApiKey,
  verifyApiKey,
  hashClientSecret,
  verifyClientSecret,
  hashAccessToken,
  hashRefreshToken,
  hashAuthorizationCode,
};
