import type { ApiEnv } from "@faworra/api/types/hono-env";
import type { MiddlewareHandler } from "hono";
import { cors } from "hono/cors";
import { secureHeaders } from "hono/secure-headers";

/**
 * Midday's exact security approach - simple and battle-tested
 * Using Hono's built-in security middleware, no custom implementations
 */

// Midday's exact CORS configuration
export const corsMiddleware = cors({
  origin: process.env.ALLOWED_API_ORIGINS?.split(",") ?? [],
  allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
  allowHeaders: [
    "Authorization",
    "Content-Type",
    "accept-language",
    "x-trpc-source",
    "x-user-locale",
    "x-user-timezone",
    "x-user-country",
  ],
  exposeHeaders: ["Content-Length"],
  maxAge: 86_400, // 24 hours (Midday's exact setting)
});

// Midday's exact security headers (uses Hono's defaults)
export const securityMiddleware = secureHeaders();

// Midday's Next.js security headers for dashboard/web apps
export const webSecurityHeaders = [
  {
    source: "/((?!api/proxy).*)", // Exclude proxy routes like Midday
    headers: [
      {
        key: "X-Frame-Options",
        value: "DENY", // Midday's exact setting
      },
    ],
  },
];

/**
 * What Hono's secureHeaders() automatically provides (Midday's approach):
 * - X-Content-Type-Options: nosniff
 * - X-Frame-Options: SAMEORIGIN (overridden to DENY in web apps)
 * - X-XSS-Protection: 1; mode=block
 * - Referrer-Policy: no-referrer
 * - Content-Security-Policy: Default restrictive policy
 */

// Midday's complete API security stack
export const apiSecurityMiddleware: MiddlewareHandler<ApiEnv>[] = [
  corsMiddleware,
  securityMiddleware,
];

// For web applications (Next.js style)
export const webSecurityMiddleware: MiddlewareHandler<ApiEnv>[] = [
  securityMiddleware,
  // X-Frame-Options: DENY would be handled in Next.js config
];

export default {
  corsMiddleware,
  securityMiddleware,
  apiSecurityMiddleware,
  webSecurityMiddleware,
  webSecurityHeaders,
};
