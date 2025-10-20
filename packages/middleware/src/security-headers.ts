import type { MiddlewareHandler } from "hono";
import type { ApiEnv } from "@faworra/api/types/hono-env";

// Security configuration interfaces
export interface CorsConfig {
  origin?: string | string[] | ((origin: string, c: any) => boolean);
  methods?: string[];
  allowedHeaders?: string[];
  exposedHeaders?: string[];
  credentials?: boolean;
  maxAge?: number;
  optionsSuccessStatus?: number;
}

export interface CspConfig {
  directives?: {
    "default-src"?: string[];
    "script-src"?: string[];
    "style-src"?: string[];
    "img-src"?: string[];
    "connect-src"?: string[];
    "font-src"?: string[];
    "object-src"?: string[];
    "media-src"?: string[];
    "frame-src"?: string[];
    "sandbox"?: string[];
    "report-uri"?: string;
    "report-to"?: string;
    "base-uri"?: string[];
    "form-action"?: string[];
    "frame-ancestors"?: string[];
    "plugin-types"?: string[];
    "require-sri-for"?: string[];
    "upgrade-insecure-requests"?: boolean;
    "block-all-mixed-content"?: boolean;
  };
  reportOnly?: boolean;
}

export interface HstsConfig {
  maxAge?: number;
  includeSubDomains?: boolean;
  preload?: boolean;
}

export interface SecurityConfig {
  // CORS configuration
  cors?: CorsConfig | boolean;
  
  // Content Security Policy
  csp?: CspConfig | boolean;
  
  // HTTP Strict Transport Security
  hsts?: HstsConfig | boolean;
  
  // X-Frame-Options
  frameOptions?: "DENY" | "SAMEORIGIN" | `ALLOW-FROM ${string}`;
  
  // X-Content-Type-Options
  noSniff?: boolean;
  
  // X-XSS-Protection
  xssProtection?: boolean | string;
  
  // Referrer Policy
  referrerPolicy?: 
    | "no-referrer"
    | "no-referrer-when-downgrade"
    | "origin"
    | "origin-when-cross-origin"
    | "same-origin"
    | "strict-origin"
    | "strict-origin-when-cross-origin"
    | "unsafe-url";
  
  // Permissions Policy (formerly Feature Policy)
  permissionsPolicy?: Record<string, string[]>;
  
  // Cross-Origin policies
  crossOriginEmbedderPolicy?: "require-corp" | "credentialless";
  crossOriginOpenerPolicy?: "same-origin" | "same-origin-allow-popups" | "unsafe-none";
  crossOriginResourcePolicy?: "same-site" | "same-origin" | "cross-origin";
  
  // Custom headers
  customHeaders?: Record<string, string>;
  
  // Team-specific overrides
  teamOverrides?: Record<string, Partial<SecurityConfig>>;
  
  // Environment-specific settings
  development?: Partial<SecurityConfig>;
  production?: Partial<SecurityConfig>;
}

// Default security configurations
export const DefaultSecurityConfigs = {
  /**
   * Strict security for production APIs
   */
  strict: {
    cors: {
      origin: false, // No CORS by default
      credentials: false,
    },
    csp: {
      directives: {
        "default-src": ["'none'"],
        "script-src": ["'none'"],
        "style-src": ["'none'"],
        "img-src": ["'none'"],
        "connect-src": ["'self'"],
        "font-src": ["'none'"],
        "object-src": ["'none'"],
        "media-src": ["'none'"],
        "frame-src": ["'none'"],
        "base-uri": ["'none'"],
        "form-action": ["'none'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": true,
        "block-all-mixed-content": true,
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: true,
    },
    frameOptions: "DENY" as const,
    noSniff: true,
    xssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginEmbedderPolicy: "require-corp",
    crossOriginOpenerPolicy: "same-origin",
    crossOriginResourcePolicy: "same-origin",
    permissionsPolicy: {
      camera: [],
      microphone: [],
      geolocation: [],
      interest_cohort: [],
    },
  } satisfies SecurityConfig,

  /**
   * Relaxed security for development
   */
  development: {
    cors: {
      origin: true, // Allow all origins in dev
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["*"],
      exposedHeaders: ["*"],
    },
    csp: false, // Disable CSP in development
    hsts: false, // No HTTPS requirement in dev
    frameOptions: "SAMEORIGIN" as const,
    noSniff: true,
    xssProtection: false, // Can interfere with dev tools
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginEmbedderPolicy: undefined,
    crossOriginOpenerPolicy: "unsafe-none",
    crossOriginResourcePolicy: "cross-origin",
  } satisfies SecurityConfig,

  /**
   * Balanced security for general web apps
   */
  webapp: {
    cors: {
      origin: (origin: string, c: any) => {
        // Allow same origin and specific domains
        const allowedOrigins = [
          "http://localhost:3000",
          "http://localhost:5173",
          "https://app.faworra.com",
          "https://faworra.com",
        ];
        return !origin || allowedOrigins.includes(origin);
      },
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH", "OPTIONS"],
      allowedHeaders: ["Content-Type", "Authorization", "X-Requested-With"],
      exposedHeaders: ["X-Total-Count", "X-RateLimit-*"],
      maxAge: 86400, // 24 hours
    },
    csp: {
      directives: {
        "default-src": ["'self'"],
        "script-src": ["'self'", "'unsafe-inline'", "https://cdn.faworra.com"],
        "style-src": ["'self'", "'unsafe-inline'", "https://fonts.googleapis.com"],
        "img-src": ["'self'", "data:", "https:", "blob:"],
        "connect-src": ["'self'", "https://api.faworra.com"],
        "font-src": ["'self'", "https://fonts.gstatic.com"],
        "object-src": ["'none'"],
        "media-src": ["'self'"],
        "frame-src": ["'self'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'self'"],
        "upgrade-insecure-requests": true,
      },
    },
    hsts: {
      maxAge: 31536000, // 1 year
      includeSubDomains: true,
      preload: false,
    },
    frameOptions: "SAMEORIGIN" as const,
    noSniff: true,
    xssProtection: "1; mode=block",
    referrerPolicy: "strict-origin-when-cross-origin",
    crossOriginOpenerPolicy: "same-origin-allow-popups",
    crossOriginResourcePolicy: "same-site",
    permissionsPolicy: {
      camera: ["'self'"],
      microphone: ["'self'"],
      geolocation: ["'self'"],
      interest_cohort: [],
    },
  } satisfies SecurityConfig,
} as const;

// Security headers middleware
export function createSecurityMiddleware(
  config: SecurityConfig = DefaultSecurityConfigs.strict
): MiddlewareHandler<ApiEnv> {
  return async (c, next) => {
    // Get team-specific configuration if available
    const teamId = c.get("teamId");
    let effectiveConfig = { ...config };
    
    if (teamId && config.teamOverrides?.[teamId]) {
      effectiveConfig = {
        ...effectiveConfig,
        ...config.teamOverrides[teamId],
      };
    }

    // Apply environment-specific overrides
    const env = process.env.NODE_ENV || "development";
    if (env === "development" && config.development) {
      effectiveConfig = {
        ...effectiveConfig,
        ...config.development,
      };
    } else if (env === "production" && config.production) {
      effectiveConfig = {
        ...effectiveConfig,
        ...config.production,
      };
    }

    // Handle CORS for preflight requests
    if (c.req.method === "OPTIONS" && effectiveConfig.cors) {
      return handleCorsPreflightRequest(c, effectiveConfig.cors);
    }

    // Apply security headers
    await applySecurityHeaders(c, effectiveConfig);

    // Process request
    await next();

    // Apply response-specific headers
    await applyResponseHeaders(c, effectiveConfig);
  };
}

// CORS preflight handling
async function handleCorsPreflightRequest(c: any, corsConfig: CorsConfig | boolean): Promise<Response> {
  if (corsConfig === false) {
    return c.text("CORS not allowed", 403);
  }

  const config = corsConfig === true ? {} : corsConfig;
  const origin = c.req.header("origin");
  const requestedMethod = c.req.header("access-control-request-method");
  const requestedHeaders = c.req.header("access-control-request-headers");

  // Check origin
  if (!isOriginAllowed(origin, config.origin, c)) {
    return c.text("CORS: Origin not allowed", 403);
  }

  // Check method
  const allowedMethods = config.methods || ["GET", "HEAD", "PUT", "PATCH", "POST", "DELETE"];
  if (requestedMethod && !allowedMethods.includes(requestedMethod)) {
    return c.text("CORS: Method not allowed", 403);
  }

  // Set CORS headers
  if (origin) {
    c.header("Access-Control-Allow-Origin", origin);
  }
  
  if (config.credentials) {
    c.header("Access-Control-Allow-Credentials", "true");
  }
  
  c.header("Access-Control-Allow-Methods", allowedMethods.join(", "));
  
  if (config.allowedHeaders) {
    c.header("Access-Control-Allow-Headers", config.allowedHeaders.join(", "));
  } else if (requestedHeaders) {
    c.header("Access-Control-Allow-Headers", requestedHeaders);
  }
  
  if (config.maxAge) {
    c.header("Access-Control-Max-Age", config.maxAge.toString());
  }

  return c.text("", config.optionsSuccessStatus || 204);
}

// Apply security headers to requests
async function applySecurityHeaders(c: any, config: SecurityConfig): Promise<void> {
  // CORS headers for actual requests
  if (config.cors && c.req.method !== "OPTIONS") {
    const corsConfig = config.cors === true ? {} : config.cors;
    const origin = c.req.header("origin");
    
    if (isOriginAllowed(origin, corsConfig.origin, c)) {
      if (origin) {
        c.header("Access-Control-Allow-Origin", origin);
      }
      
      if (corsConfig.credentials) {
        c.header("Access-Control-Allow-Credentials", "true");
      }
      
      if (corsConfig.exposedHeaders) {
        c.header("Access-Control-Expose-Headers", corsConfig.exposedHeaders.join(", "));
      }
    }
  }

  // X-Frame-Options
  if (config.frameOptions) {
    c.header("X-Frame-Options", config.frameOptions);
  }

  // X-Content-Type-Options
  if (config.noSniff) {
    c.header("X-Content-Type-Options", "nosniff");
  }

  // X-XSS-Protection
  if (config.xssProtection) {
    const value = typeof config.xssProtection === "string" 
      ? config.xssProtection 
      : "1; mode=block";
    c.header("X-XSS-Protection", value);
  }

  // Referrer Policy
  if (config.referrerPolicy) {
    c.header("Referrer-Policy", config.referrerPolicy);
  }

  // Cross-Origin policies
  if (config.crossOriginEmbedderPolicy) {
    c.header("Cross-Origin-Embedder-Policy", config.crossOriginEmbedderPolicy);
  }
  
  if (config.crossOriginOpenerPolicy) {
    c.header("Cross-Origin-Opener-Policy", config.crossOriginOpenerPolicy);
  }
  
  if (config.crossOriginResourcePolicy) {
    c.header("Cross-Origin-Resource-Policy", config.crossOriginResourcePolicy);
  }

  // Permissions Policy
  if (config.permissionsPolicy) {
    const policy = Object.entries(config.permissionsPolicy)
      .map(([directive, allowlist]) => {
        const sources = allowlist.length > 0 ? `(${allowlist.join(" ")})` : "()";
        return `${directive}=${sources}`;
      })
      .join(", ");
    
    if (policy) {
      c.header("Permissions-Policy", policy);
    }
  }

  // Custom headers
  if (config.customHeaders) {
    Object.entries(config.customHeaders).forEach(([name, value]) => {
      c.header(name, value);
    });
  }
}

// Apply response-specific headers
async function applyResponseHeaders(c: any, config: SecurityConfig): Promise<void> {
  // HSTS (only for HTTPS)
  const isHttps = c.req.header("x-forwarded-proto") === "https" || 
                  c.req.url.startsWith("https:");
  
  if (config.hsts && isHttps) {
    const hstsConfig = config.hsts === true ? {} : config.hsts;
    let hstsValue = `max-age=${hstsConfig.maxAge || 31536000}`;
    
    if (hstsConfig.includeSubDomains) {
      hstsValue += "; includeSubDomains";
    }
    
    if (hstsConfig.preload) {
      hstsValue += "; preload";
    }
    
    c.header("Strict-Transport-Security", hstsValue);
  }

  // Content Security Policy
  if (config.csp) {
    const cspConfig = config.csp === true ? { directives: {} } : config.csp;
    const cspString = buildCspString(cspConfig.directives || {});
    
    if (cspString) {
      const headerName = cspConfig.reportOnly 
        ? "Content-Security-Policy-Report-Only" 
        : "Content-Security-Policy";
      c.header(headerName, cspString);
    }
  }
}

// Helper functions
function isOriginAllowed(origin: string | undefined, allowedOrigins: CorsConfig["origin"], c: any): boolean {
  if (!allowedOrigins) return false;
  if (allowedOrigins === true) return true;
  if (!origin) return false;
  
  if (typeof allowedOrigins === "function") {
    return allowedOrigins(origin, c);
  }
  
  if (typeof allowedOrigins === "string") {
    return origin === allowedOrigins;
  }
  
  if (Array.isArray(allowedOrigins)) {
    return allowedOrigins.includes(origin);
  }
  
  return false;
}

function buildCspString(directives: NonNullable<CspConfig["directives"]>): string {
  return Object.entries(directives)
    .map(([directive, value]) => {
      if (directive === "upgrade-insecure-requests" && value) {
        return "upgrade-insecure-requests";
      }
      if (directive === "block-all-mixed-content" && value) {
        return "block-all-mixed-content";
      }
      if (typeof value === "string") {
        return `${directive} ${value}`;
      }
      if (Array.isArray(value) && value.length > 0) {
        return `${directive} ${value.join(" ")}`;
      }
      return "";
    })
    .filter(Boolean)
    .join("; ");
}

// Team-specific security profiles
export function createTeamSecurityProfile(teamId: string, profile: SecurityConfig): SecurityConfig {
  return {
    ...DefaultSecurityConfigs.webapp,
    teamOverrides: {
      [teamId]: profile,
    },
  };
}

// Predefined security middleware instances
export const SecurityMiddleware = {
  /**
   * Strict security for APIs
   */
  strict: createSecurityMiddleware(DefaultSecurityConfigs.strict),

  /**
   * Development-friendly security
   */
  development: createSecurityMiddleware(DefaultSecurityConfigs.development),

  /**
   * Web application security
   */
  webapp: createSecurityMiddleware(DefaultSecurityConfigs.webapp),

  /**
   * API with CORS support
   */
  apiWithCors: createSecurityMiddleware({
    ...DefaultSecurityConfigs.strict,
    cors: {
      origin: ["https://app.faworra.com", "https://faworra.com"],
      credentials: true,
      methods: ["GET", "POST", "PUT", "DELETE", "PATCH"],
      allowedHeaders: ["Content-Type", "Authorization"],
      exposedHeaders: ["X-Total-Count", "X-RateLimit-Remaining"],
    },
  }),

  /**
   * File upload endpoints
   */
  fileUpload: createSecurityMiddleware({
    ...DefaultSecurityConfigs.webapp,
    permissionsPolicy: {
      camera: ["'self'"],
      microphone: [],
      geolocation: [],
      interest_cohort: [],
    },
    customHeaders: {
      "X-Upload-Size-Limit": "10MB",
    },
  }),

  /**
   * Payment endpoints (extra strict)
   */
  payment: createSecurityMiddleware({
    ...DefaultSecurityConfigs.strict,
    hsts: {
      maxAge: 63072000, // 2 years
      includeSubDomains: true,
      preload: true,
    },
    csp: {
      directives: {
        "default-src": ["'none'"],
        "script-src": ["'self'"],
        "connect-src": ["'self'"],
        "img-src": ["'self'"],
        "style-src": ["'self'"],
        "font-src": ["'self'"],
        "object-src": ["'none'"],
        "base-uri": ["'self'"],
        "form-action": ["'self'"],
        "frame-ancestors": ["'none'"],
        "upgrade-insecure-requests": true,
        "block-all-mixed-content": true,
      },
      reportOnly: false,
    },
    customHeaders: {
      "X-Payment-Secure": "true",
      "Cache-Control": "no-store, no-cache, must-revalidate",
    },
  }),
};

export default createSecurityMiddleware;