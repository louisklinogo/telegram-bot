import type { MiddlewareHandler } from 'hono';
import type { ApiEnv } from '@faworra/api/types/hono-env';

/**
 * Advanced Security Headers & Policies for OAuth Endpoints
 * Enterprise-grade security headers and CSP implementation
 * Following security best practices for OAuth providers
 */

export interface SecurityHeadersOptions {
  environment?: 'development' | 'staging' | 'production';
  enableCSP?: boolean;
  enableHSTS?: boolean;
  enableCORP?: boolean;
  enableCOEP?: boolean;
  customHeaders?: Record<string, string>;
  trustedDomains?: string[];
  reportUri?: string;
}

export interface CSPDirectives {
  defaultSrc?: string[];
  scriptSrc?: string[];
  styleSrc?: string[];
  imgSrc?: string[];
  fontSrc?: string[];
  connectSrc?: string[];
  mediaSrc?: string[];
  objectSrc?: string[];
  childSrc?: string[];
  frameSrc?: string[];
  workerSrc?: string[];
  manifestSrc?: string[];
  formAction?: string[];
  frameAncestors?: string[];
  baseUri?: string[];
  upgradeInsecureRequests?: boolean;
  blockAllMixedContent?: boolean;
  requireSriFor?: string[];
  reportUri?: string;
  reportTo?: string;
}

const DEFAULT_OPTIONS: Required<SecurityHeadersOptions> = {
  environment: (process.env.NODE_ENV as any) || 'development',
  enableCSP: true,
  enableHSTS: true,
  enableCORP: true,
  enableCOEP: false, // Can break OAuth flows, disabled by default
  customHeaders: {},
  trustedDomains: [],
  reportUri: '',
};

/**
 * OAuth Security Headers Middleware
 * Implements comprehensive security headers for OAuth endpoints
 */
export const oauthSecurityHeaders = (options: Partial<SecurityHeadersOptions> = {}): MiddlewareHandler<ApiEnv> => {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  
  return async (c, next) => {
    const isProduction = opts.environment === 'production';
    const isOAuthEndpoint = c.req.path.includes('/oauth/');
    
    // Set basic security headers
    setBasicSecurityHeaders(c, opts);
    
    // Set HSTS for HTTPS traffic
    if (opts.enableHSTS && isProduction) {
      setHSTSHeaders(c);
    }
    
    // Set Content Security Policy
    if (opts.enableCSP) {
      setCSPHeaders(c, opts, isOAuthEndpoint);
    }
    
    // Set Cross-Origin policies
    setCrossOriginHeaders(c, opts);
    
    // Set OAuth-specific security headers
    if (isOAuthEndpoint) {
      setOAuthSpecificHeaders(c, opts);
    }
    
    // Set custom headers
    setCustomHeaders(c, opts.customHeaders);
    
    await next();
  };
};

/**
 * Set basic security headers
 */
function setBasicSecurityHeaders(c: any, opts: Required<SecurityHeadersOptions>): void {
  const headers = {
    // Prevent MIME type sniffing
    'X-Content-Type-Options': 'nosniff',
    
    // XSS protection for legacy browsers
    'X-XSS-Protection': '1; mode=block',
    
    // Prevent clickjacking
    'X-Frame-Options': 'DENY',
    
    // Referrer policy for privacy
    'Referrer-Policy': 'strict-origin-when-cross-origin',
    
    // Permissions policy (formerly Feature Policy)
    'Permissions-Policy': [
      'geolocation=()',
      'microphone=()',
      'camera=()',
      'fullscreen=(self)',
      'payment=()',
      'usb=()',
      'magnetometer=()',
      'gyroscope=()',
      'accelerometer=()',
      'ambient-light-sensor=()',
    ].join(', '),
    
    // Server identification (security through obscurity)
    'Server': 'Faworra-OAuth-Server',
    
    // Cache control for sensitive endpoints
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    'Pragma': 'no-cache',
    'Expires': '0',
  };
  
  Object.entries(headers).forEach(([key, value]) => {
    c.header(key, value);
  });
}

/**
 * Set HSTS headers for production
 */
function setHSTSHeaders(c: any): void {
  // HTTP Strict Transport Security
  // 1 year max-age, include subdomains, preload
  c.header('Strict-Transport-Security', 'max-age=31536000; includeSubDomains; preload');
}

/**
 * Set Content Security Policy headers
 */
function setCSPHeaders(c: any, opts: Required<SecurityHeadersOptions>, isOAuthEndpoint: boolean): void {
  const cspDirectives: CSPDirectives = isOAuthEndpoint 
    ? getOAuthCSPDirectives(opts)
    : getDefaultCSPDirectives(opts);
  
  const cspString = buildCSPString(cspDirectives);
  
  // Set CSP header
  c.header('Content-Security-Policy', cspString);
  
  // Also set report-only for monitoring (in addition to enforced policy)
  if (opts.reportUri) {
    const reportOnlyCSP = buildCSPString({
      ...cspDirectives,
      reportUri: opts.reportUri,
    });
    c.header('Content-Security-Policy-Report-Only', reportOnlyCSP);
  }
}

/**
 * Get CSP directives for OAuth endpoints
 */
function getOAuthCSPDirectives(opts: Required<SecurityHeadersOptions>): CSPDirectives {
  const trustedDomains = opts.trustedDomains.length > 0 ? opts.trustedDomains : ["'self'"];
  
  return {
    defaultSrc: ["'none'"],
    scriptSrc: ["'self'", "'unsafe-inline'", ...trustedDomains], // OAuth consent screens may need inline scripts
    styleSrc: ["'self'", "'unsafe-inline'", ...trustedDomains], // OAuth consent screens need styling
    imgSrc: ["'self'", 'data:', 'https:', ...trustedDomains], // OAuth apps may have logos
    fontSrc: ["'self'", ...trustedDomains],
    connectSrc: ["'self'", ...trustedDomains],
    mediaSrc: ["'none'"],
    objectSrc: ["'none'"],
    childSrc: ["'none'"],
    frameSrc: ["'none'"],
    workerSrc: ["'none'"],
    manifestSrc: ["'self'"],
    formAction: ["'self'", ...trustedDomains], // OAuth forms need to submit
    frameAncestors: ["'none'"], // Prevent embedding OAuth pages
    baseUri: ["'self'"],
    upgradeInsecureRequests: opts.environment === 'production',
    blockAllMixedContent: opts.environment === 'production',
    requireSriFor: opts.environment === 'production' ? ['script', 'style'] : [],
    reportUri: opts.reportUri,
  };
}

/**
 * Get default CSP directives for non-OAuth endpoints
 */
function getDefaultCSPDirectives(opts: Required<SecurityHeadersOptions>): CSPDirectives {
  const trustedDomains = opts.trustedDomains.length > 0 ? opts.trustedDomains : ["'self'"];
  
  return {
    defaultSrc: ["'self'"],
    scriptSrc: ["'self'", ...trustedDomains],
    styleSrc: ["'self'", ...trustedDomains],
    imgSrc: ["'self'", 'data:', ...trustedDomains],
    fontSrc: ["'self'", ...trustedDomains],
    connectSrc: ["'self'", ...trustedDomains],
    mediaSrc: ["'self'"],
    objectSrc: ["'none'"],
    childSrc: ["'self'"],
    frameSrc: ["'none'"],
    workerSrc: ["'self'"],
    manifestSrc: ["'self'"],
    formAction: ["'self'"],
    frameAncestors: ["'none'"],
    baseUri: ["'self'"],
    upgradeInsecureRequests: opts.environment === 'production',
    blockAllMixedContent: opts.environment === 'production',
    requireSriFor: opts.environment === 'production' ? ['script', 'style'] : [],
    reportUri: opts.reportUri,
  };
}

/**
 * Build CSP string from directives
 */
function buildCSPString(directives: CSPDirectives): string {
  const cspParts: string[] = [];
  
  // Handle regular directives
  const directiveMap: Array<[keyof CSPDirectives, string]> = [
    ['defaultSrc', 'default-src'],
    ['scriptSrc', 'script-src'],
    ['styleSrc', 'style-src'],
    ['imgSrc', 'img-src'],
    ['fontSrc', 'font-src'],
    ['connectSrc', 'connect-src'],
    ['mediaSrc', 'media-src'],
    ['objectSrc', 'object-src'],
    ['childSrc', 'child-src'],
    ['frameSrc', 'frame-src'],
    ['workerSrc', 'worker-src'],
    ['manifestSrc', 'manifest-src'],
    ['formAction', 'form-action'],
    ['frameAncestors', 'frame-ancestors'],
    ['baseUri', 'base-uri'],
  ];
  
  directiveMap.forEach(([key, directive]) => {
    const values = directives[key];
    if (values && values.length > 0) {
      cspParts.push(`${directive} ${values.join(' ')}`);
    }
  });
  
  // Handle boolean directives
  if (directives.upgradeInsecureRequests) {
    cspParts.push('upgrade-insecure-requests');
  }
  
  if (directives.blockAllMixedContent) {
    cspParts.push('block-all-mixed-content');
  }
  
  // Handle special directives
  if (directives.requireSriFor && directives.requireSriFor.length > 0) {
    cspParts.push(`require-sri-for ${directives.requireSriFor.join(' ')}`);
  }
  
  if (directives.reportUri) {
    cspParts.push(`report-uri ${directives.reportUri}`);
  }
  
  if (directives.reportTo) {
    cspParts.push(`report-to ${directives.reportTo}`);
  }
  
  return cspParts.join('; ');
}

/**
 * Set Cross-Origin headers
 */
function setCrossOriginHeaders(c: any, opts: Required<SecurityHeadersOptions>): void {
  // Cross-Origin Resource Policy
  if (opts.enableCORP) {
    c.header('Cross-Origin-Resource-Policy', 'same-site');
  }
  
  // Cross-Origin Embedder Policy
  if (opts.enableCOEP) {
    c.header('Cross-Origin-Embedder-Policy', 'require-corp');
  }
  
  // Cross-Origin Opener Policy
  c.header('Cross-Origin-Opener-Policy', 'same-origin');
}

/**
 * Set OAuth-specific security headers
 */
function setOAuthSpecificHeaders(c: any, opts: Required<SecurityHeadersOptions>): void {
  // Prevent OAuth pages from being cached
  c.header('Cache-Control', 'no-store, no-cache, must-revalidate, max-age=0');
  c.header('Pragma', 'no-cache');
  c.header('Expires', 'Thu, 01 Jan 1970 00:00:00 GMT');
  
  // Additional security for OAuth endpoints
  c.header('X-Robots-Tag', 'noindex, nofollow, noarchive, nosnippet');
  
  // Prevent OAuth pages from being embedded
  c.header('X-Frame-Options', 'DENY');
  
  // OAuth-specific referrer policy
  c.header('Referrer-Policy', 'no-referrer');
  
  // Clear site data on logout (for OAuth revocation endpoints)
  if (c.req.path.includes('/revoke')) {
    c.header('Clear-Site-Data', '"cache", "cookies", "storage"');
  }
}

/**
 * Set custom headers
 */
function setCustomHeaders(c: any, customHeaders: Record<string, string>): void {
  Object.entries(customHeaders).forEach(([key, value]) => {
    c.header(key, value);
  });
}

/**
 * Security Headers Validator
 * Validates that all required security headers are properly set
 */
export class SecurityHeadersValidator {
  /**
   * Validate security headers on response
   */
  static validate(headers: Headers, isOAuthEndpoint: boolean = false): {
    valid: boolean;
    missing: string[];
    warnings: string[];
  } {
    const required = [
      'X-Content-Type-Options',
      'X-Frame-Options',
      'Referrer-Policy',
      'Content-Security-Policy',
    ];
    
    const recommended = [
      'X-XSS-Protection',
      'Permissions-Policy',
      'Cache-Control',
    ];
    
    const oauthRequired = [
      'X-Robots-Tag',
    ];
    
    const missing: string[] = [];
    const warnings: string[] = [];
    
    // Check required headers
    required.forEach(header => {
      if (!headers.get(header)) {
        missing.push(header);
      }
    });
    
    // Check OAuth-specific headers
    if (isOAuthEndpoint) {
      oauthRequired.forEach(header => {
        if (!headers.get(header)) {
          missing.push(header);
        }
      });
    }
    
    // Check recommended headers
    recommended.forEach(header => {
      if (!headers.get(header)) {
        warnings.push(`Recommended header missing: ${header}`);
      }
    });
    
    // Validate specific header values
    const frameOptions = headers.get('X-Frame-Options');
    if (frameOptions && frameOptions !== 'DENY' && frameOptions !== 'SAMEORIGIN') {
      warnings.push('X-Frame-Options should be DENY or SAMEORIGIN');
    }
    
    const contentType = headers.get('X-Content-Type-Options');
    if (contentType && contentType !== 'nosniff') {
      warnings.push('X-Content-Type-Options should be nosniff');
    }
    
    return {
      valid: missing.length === 0,
      missing,
      warnings,
    };
  }
  
  /**
   * Get security score based on headers
   */
  static getSecurityScore(headers: Headers, isOAuthEndpoint: boolean = false): {
    score: number;
    maxScore: number;
    details: Record<string, boolean>;
  } {
    const checks = {
      'X-Content-Type-Options': !!headers.get('X-Content-Type-Options'),
      'X-Frame-Options': !!headers.get('X-Frame-Options'),
      'X-XSS-Protection': !!headers.get('X-XSS-Protection'),
      'Referrer-Policy': !!headers.get('Referrer-Policy'),
      'Content-Security-Policy': !!headers.get('Content-Security-Policy'),
      'Permissions-Policy': !!headers.get('Permissions-Policy'),
      'Strict-Transport-Security': !!headers.get('Strict-Transport-Security'),
      'Cross-Origin-Opener-Policy': !!headers.get('Cross-Origin-Opener-Policy'),
    };
    
    if (isOAuthEndpoint) {
      checks['X-Robots-Tag'] = !!headers.get('X-Robots-Tag');
      checks['Cache-Control'] = !!headers.get('Cache-Control');
    }
    
    const score = Object.values(checks).filter(Boolean).length;
    const maxScore = Object.keys(checks).length;
    
    return { score, maxScore, details: checks };
  }
}

/**
 * Middleware to validate security headers (for testing/monitoring)
 */
export const securityHeadersValidator = (): MiddlewareHandler<ApiEnv> => {
  return async (c, next) => {
    await next();
    
    const isOAuthEndpoint = c.req.path.includes('/oauth/');
    const validation = SecurityHeadersValidator.validate(c.res.headers, isOAuthEndpoint);
    
    if (!validation.valid) {
      console.warn('[SECURITY] Missing required headers:', validation.missing);
    }
    
    if (validation.warnings.length > 0) {
      console.warn('[SECURITY] Header warnings:', validation.warnings);
    }
    
    // Add security score to response headers for monitoring
    const score = SecurityHeadersValidator.getSecurityScore(c.res.headers, isOAuthEndpoint);
    c.header('X-Security-Score', `${score.score}/${score.maxScore}`);
  };
};

export default {
  oauthSecurityHeaders,
  SecurityHeadersValidator,
  securityHeadersValidator,
};