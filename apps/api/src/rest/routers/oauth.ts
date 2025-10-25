// Import schemas
import {
  oauthApplicationInfoSchema,
  oauthAuthorizationDecisionSchema,
  oauthAuthorizationRequestSchema,
  oauthErrorResponseSchema,
  oauthRefreshTokenRequestSchema,
  oauthRevokeTokenRequestSchema,
  oauthTokenRequestSchema,
  oauthTokenResponseSchema,
} from "@faworra/api/schemas/oauth-flow";
// Import OAuth service
import { oauthApplicationService } from "@faworra/auth/oauth-applications";
// Import middleware
import { globalErrorHandler } from "@faworra/middleware/error-handling";
import { rateLimitingMiddleware } from "@faworra/middleware/rate-limiting-simple";
import { createRoute, OpenAPIHono } from "@hono/zod-openapi";
import { HTTPException } from "hono/http-exception";
import { z } from "zod";
import type { ApiEnv } from "../../types/hono-env";
import baseLogger from "../../lib/logger";

/**
 * OAuth 2.0 Server Implementation
 * Following Midday's exact patterns for authorization, token exchange, and revocation
 */

const app = new OpenAPIHono<ApiEnv>();
const HTTP = {
  OK: 200,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
  NOT_IMPLEMENTED: 501,
} as const;

const BEARER_PREFIX = "Bearer ";

function ensure(condition: unknown, message: string, status = HTTP.BAD_REQUEST): asserts condition {
  if (!condition) throw new HTTPException(status, { message });
}

function parseScopes(scope: string | undefined): string[] {
  return scope ? scope.split(" ").filter(Boolean) : [];
}

// Helpers to keep handlers simple
async function parseBody(c: OpenAPIHono<ApiEnv>["req"] | any): Promise<any> {
  const contentType = c.header ? c.header("content-type") || "" : "";
  if (contentType.includes("application/x-www-form-urlencoded")) {
    return c.parseBody();
  }
  return c.valid ? c.valid("json") : {};
}

function getAccessTokenFromHeader(authHeader?: string | null): string | undefined {
  if (!authHeader) return undefined;
  return authHeader.startsWith(BEARER_PREFIX) ? authHeader.slice(BEARER_PREFIX.length) : undefined;
}

// Apply middleware
app.use("*", globalErrorHandler);

// Apply rate limiting (following Midday's OAuth rate limits)
app.use("*", rateLimitingMiddleware.oauthEndpoints()); // 20 req per 15min per IP

// OAuth Authorization Endpoint - GET (consent screen)
app.openapi(
  createRoute({
    method: "get",
    path: "/authorize",
    summary: "OAuth Authorization Endpoint",
    operationId: "getOAuthAuthorization",
    description: "Initiate OAuth authorization flow and get consent screen information",
    tags: ["OAuth"],
    request: {
      query: oauthAuthorizationRequestSchema,
    },
    responses: {
      200: {
        description: "Application information for consent screen",
        content: {
          "application/json": {
            schema: oauthApplicationInfoSchema,
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: oauthErrorResponseSchema,
          },
        },
      },
    },
  }),
  (c) => {
    const query = c.req.valid("query");
    const { client_id, redirect_uri, scope, state, code_challenge } = query;

    try {
      // Validate client_id (get application from database)
      // TODO: Replace with actual database call
      // const application = await getOAuthApplicationByClientId(client_id);
      const application: any = null; // Placeholder
      ensure(application?.active, "Invalid client_id");

      // Enforce PKCE for public clients (following Midday's security)
      if (application.isPublic && !code_challenge) {
        throw new HTTPException(HTTP.BAD_REQUEST, {
          message: "PKCE is required for public clients",
        });
      }

      // Validate redirect_uri
      if (!application.redirectUris.includes(redirect_uri)) {
        throw new HTTPException(HTTP.BAD_REQUEST, { message: "Invalid redirect_uri" });
      }

      // Validate scopes
      const requestedScopes = parseScopes(scope);
      const invalidScopes = requestedScopes.filter((s) => !application.scopes.includes(s));

      if (invalidScopes.length > 0) {
        throw new HTTPException(HTTP.BAD_REQUEST, {
          message: `Invalid scopes: ${invalidScopes.join(", ")}`,
        });
      }

      // Return application info for consent screen
      const applicationInfo = {
        id: application.id,
        name: application.name,
        description: application.description,
        logoUrl: application.logoUrl,
        website: application.website,
        clientId: application.clientId,
        scopes: requestedScopes,
        redirectUri: redirect_uri,
        state,
      };

      return c.json(applicationInfo);
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(HTTP.BAD_REQUEST, { message: "Invalid authorization request" });
    }
  }
);

// OAuth Authorization Decision Endpoint - POST (user consent)
app.openapi(
  createRoute({
    method: "post",
    path: "/authorize",
    summary: "OAuth Authorization Decision",
    operationId: "postOAuthAuthorization",
    description: "Process user's authorization decision (allow/deny)",
    tags: ["OAuth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: oauthAuthorizationDecisionSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Authorization decision processed, returns redirect URL",
        content: {
          "application/json": {
            schema: z.object({
              redirect_url: z.string().url(),
            }),
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: z.object({
              redirect_url: z.string().url(),
            }),
          },
        },
      },
      401: {
        description: "Unauthorized",
        content: {
          "application/json": {
            schema: z.object({
              redirect_url: z.string().url(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const authHeader = c.req.header("Authorization");
    const body = c.req.valid("json");

    const { client_id, decision, scopes, redirect_uri, state, code_challenge, team_id } = body;

    try {
      // Verify user authentication (get from JWT token)
      const accessToken = getAccessTokenFromHeader(authHeader);
      ensure(accessToken, "User must be authenticated", HTTP.UNAUTHORIZED);

      // TODO: Verify access token and get user session
      // const session = await verifyAccessToken(accessToken);
      const session: any = null; // Placeholder

      ensure(session, "Invalid access token", HTTP.UNAUTHORIZED);

      // Validate client_id
      // TODO: Replace with actual database call
      const application: any = null; // Placeholder
      ensure(application?.active, "Invalid client_id");

      // Enforce PKCE for public clients
      if (application.isPublic && !code_challenge) {
        throw new HTTPException(HTTP.BAD_REQUEST, {
          message: "PKCE is required for public clients",
        });
      }

      // Validate user is a member of the selected team
      // TODO: Check user team membership
      // const userTeams = await getTeamsByUserId(session.user.id);
      // const isMemberOfTeam = userTeams.some((team) => team.id === team_id);

      const redirectUrl = new URL(redirect_uri);

      // Handle denial
      if (decision === "deny") {
        redirectUrl.searchParams.set("error", "access_denied");
        redirectUrl.searchParams.set("error_description", "User denied access");
        if (state) {
          redirectUrl.searchParams.set("state", state);
        }
        return c.json({ redirect_url: redirectUrl.toString() });
      }

      // Create authorization code
      const authCode = await oauthApplicationService.createAuthorizationCode({
        applicationId: application.id,
        userId: session.user.id,
        teamId: team_id,
        scopes,
        redirectUri: redirect_uri,
        codeChallenge: code_challenge,
      });

      ensure(authCode, "Failed to create authorization code", HTTP.INTERNAL_SERVER_ERROR);

      // TODO: Send app installation email (like Midday)
      // Check if user has ever authorized this application before
      // Send email notification if this is first time

      // Build success redirect URL
      redirectUrl.searchParams.set("code", authCode.code);
      if (state) {
        redirectUrl.searchParams.set("state", state);
      }

      return c.json({ redirect_url: redirectUrl.toString() });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(HTTP.BAD_REQUEST, {
        message: "Failed to process authorization decision",
      });
    }
  }
);

// OAuth Token Exchange Endpoint
app.openapi(
  createRoute({
    method: "post",
    path: "/token",
    summary: "OAuth Token Exchange",
    operationId: "postOAuthToken",
    description: "Exchange authorization code for access token or refresh an access token",
    tags: ["OAuth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: z.union([oauthTokenRequestSchema, oauthRefreshTokenRequestSchema]),
          },
          "application/x-www-form-urlencoded": {
            schema: z.union([oauthTokenRequestSchema, oauthRefreshTokenRequestSchema]),
          },
        },
      },
    },
    responses: {
      200: {
        description: "Token exchange successful",
        content: {
          "application/json": {
            schema: oauthTokenResponseSchema,
          },
        },
      },
      400: {
        description: "Invalid request",
        content: {
          "application/json": {
            schema: oauthErrorResponseSchema,
          },
        },
      },
    },
  }),
  async (c) => {
    const logger = c.get("logger") || baseLogger;
    const body: any = await (async () => {
      const ct = c.req.header("content-type") || "";
      if (ct.includes("application/x-www-form-urlencoded")) return c.req.parseBody();
      return c.req.valid("json");
    })();

    const {
      grant_type,
      code,
      redirect_uri,
      client_id,
      client_secret,
      code_verifier,
      refresh_token,
      scope,
    } = body;

    try {
      // Validate client credentials
      const application = await oauthApplicationService.validateClientCredentials(
        client_id,
        client_secret
      );

      ensure(application, "Invalid client credentials");

      if (grant_type === "authorization_code") {
        ensure(code && redirect_uri, "Missing required parameters: code and redirect_uri are required");
        try {
          const tokenResponse = await oauthApplicationService.exchangeAuthorizationCode({
            code,
            redirectUri: redirect_uri,
            applicationId: application.id,
            codeVerifier: code_verifier,
          });

          return c.json({
            access_token: tokenResponse.accessToken,
            token_type: tokenResponse.tokenType,
            expires_in: tokenResponse.expiresIn,
            refresh_token: tokenResponse.refreshToken || "",
            scope: tokenResponse.scopes.join(" "),
          });
        } catch (error) {
          const msg = error instanceof Error ? error.message : "Unknown error";
          logger.warn({ msg }, "oauth code exchange error");
          if (msg.includes("Authorization code expired")) {
            throw new HTTPException(HTTP.BAD_REQUEST, {
              message: "The authorization code has expired. Please restart the OAuth flow.",
            });
          }
          if (msg.includes("Authorization code already used")) {
            throw new HTTPException(HTTP.BAD_REQUEST, {
              message:
                "The authorization code has already been used. All related tokens have been revoked for security.",
            });
          }
          if (msg.includes("Invalid authorization code")) {
            throw new HTTPException(HTTP.BAD_REQUEST, {
              message: "The authorization code is invalid or malformed.",
            });
          }
          if (msg.includes("redirect_uri")) {
            throw new HTTPException(HTTP.BAD_REQUEST, {
              message: "The redirect_uri does not match the one used in the authorization request.",
            });
          }
          throw new HTTPException(HTTP.BAD_REQUEST, {
            message: "Failed to exchange authorization code for access token.",
          });
        }
      }

      if (grant_type === "refresh_token") {
        ensure(refresh_token, "Missing refresh_token");
        try {
          const requestedScopes = scope ? parseScopes(scope) : undefined;
          // TODO implement refresh token
          throw new HTTPException(HTTP.NOT_IMPLEMENTED, {
            message: "Refresh token flow not yet implemented",
          });
        } catch (error) {
          const em = error instanceof Error ? error.message : "Unknown error";
          if (em.includes("Invalid refresh token")) {
            throw new HTTPException(HTTP.BAD_REQUEST, { message: "Invalid refresh token" });
          }
          if (em.includes("expired")) {
            throw new HTTPException(HTTP.BAD_REQUEST, { message: "Refresh token expired" });
          }
          if (em.includes("revoked")) {
            throw new HTTPException(HTTP.BAD_REQUEST, { message: "Refresh token revoked" });
          }
          throw new HTTPException(HTTP.BAD_REQUEST, { message: "Failed to refresh access token" });
        }
      }

      throw new HTTPException(HTTP.BAD_REQUEST, { message: "Grant type not supported" });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(HTTP.BAD_REQUEST, { message: "Token exchange failed" });
    }
  }
);

// OAuth Token Revocation Endpoint
app.openapi(
  createRoute({
    method: "post",
    path: "/revoke",
    summary: "OAuth Token Revocation",
    operationId: "postOAuthRevoke",
    description: "Revoke an access token or refresh token",
    tags: ["OAuth"],
    request: {
      body: {
        content: {
          "application/json": {
            schema: oauthRevokeTokenRequestSchema,
          },
          "application/x-www-form-urlencoded": {
            schema: oauthRevokeTokenRequestSchema,
          },
        },
      },
    },
    responses: {
      200: {
        description: "Token revocation successful",
        content: {
          "application/json": {
            schema: z.object({
              success: z.boolean(),
            }),
          },
        },
      },
    },
  }),
  async (c) => {
    const ct = c.req.header("content-type") || "";
    const body: any = ct.includes("application/x-www-form-urlencoded")
      ? await c.req.parseBody()
      : c.req.valid("json");

    const { token, client_id, client_secret } = body;

    try {
      // Validate client credentials
      const application = await oauthApplicationService.validateClientCredentials(
        client_id,
        client_secret
      );

      ensure(application, "Invalid client credentials");

      // Revoke token
      await oauthApplicationService.revokeToken({
        token,
        applicationId: application.id,
      });

      return c.json({ success: true });
    } catch (error) {
      if (error instanceof HTTPException) throw error;
      throw new HTTPException(HTTP.BAD_REQUEST, { message: "Token revocation failed" });
    }
  }
);

export default app;
