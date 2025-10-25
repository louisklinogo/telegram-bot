import { AuthEvents, trackAuthEvent } from "@Faworra/analytics/auth-events";
import type { ApiKey } from "@Faworra/auth/api-keys";
import { apiKeyService } from "@Faworra/auth/api-keys";
import { RateLimiters } from "@Faworra/middleware/rate-limiter";
import type { MiddlewareHandler } from "hono";
import { createAdminClient, createClient } from "../../services/supabase";
import type { ApiEnv } from "../../types/hono-env";

export interface AuthSession {
  userId: string;
  teamId: string;
  user: {
    id: string;
    email?: string;
    fullName?: string;
  };
  type: "jwt" | "api_key";
  scopes?: string[];
  apiKey?: ApiKey;
}

export const requireAuthTeam: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const authHeader = c.req.header("authorization") || c.req.header("Authorization");
  const token = authHeader?.startsWith("Bearer ") ? authHeader.substring(7) : undefined;

  if (!token) {
    await trackAuthEvent({
      event: "SignIn.Failed",
      error: "Missing authorization header",
      errorType: "missing_token",
    });
    return c.json({ error: "Unauthorized" }, 401);
  }

  let session: AuthSession;

  // Handle API Keys (faw_api_*)
  if (token.startsWith("faw_api_")) {
    const validation = await apiKeyService.validateApiKey(token);

    if (!(validation.valid && validation.apiKey)) {
      await trackAuthEvent({
        event: "SignIn.Failed",
        error: validation.error || "Invalid API key",
        errorType: "invalid_api_key",
      });
      return c.json(
        {
          error: "Invalid API key",
          details: validation.error,
        },
        401
      );
    }

    const apiKey = validation.apiKey;

    // Track API key usage in analytics
    await trackAuthEvent(AuthEvents.apiKeyUsed(apiKey.userId, apiKey.teamId, apiKey.scopes));

    // Log detailed API key usage for monitoring
    const startTime = Date.now();
    c.set("apiKeyUsageStart", startTime);
    c.set("apiKeyId", apiKey.id);

    session = {
      userId: apiKey.userId,
      teamId: apiKey.teamId,
      user: {
        id: apiKey.userId,
        email: apiKey.user?.email,
        fullName: apiKey.user?.fullName,
      },
      type: "api_key",
      scopes: apiKey.scopes,
      apiKey,
    };
  }
  // Handle JWT tokens (existing logic)
  else {
    const supabase = createClient();
    const admin = createAdminClient();

    const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
    if (authErr || !userRes?.user) {
      await trackAuthEvent({
        event: "SignIn.Failed",
        error: authErr?.message || "Invalid user token",
        errorType: "invalid_jwt",
      });
      return c.json({ error: "Invalid token" }, 401);
    }

    const userId = userRes.user.id;

    const { data: uRow, error: uErr } = await admin
      .from("users")
      .select("current_team_id")
      .eq("id", userId)
      .maybeSingle<{ current_team_id: string | null }>();

    if (uErr) return c.json({ error: uErr.message }, 500);

    const teamId = uRow?.current_team_id || null;
    if (!teamId) {
      await trackAuthEvent({
        event: "SignIn.Failed",
        userId,
        error: "No team selected",
        errorType: "no_team_selected",
      });
      return c.json({ error: "No team selected" }, 403);
    }

    session = {
      userId,
      teamId,
      user: {
        id: userId,
        email: userRes.user.email,
        fullName: userRes.user.user_metadata?.full_name,
      },
      type: "jwt",
    };

    // Track successful JWT access
    await trackAuthEvent({
      event: "TokenRefresh", // Using existing event type for API access
      userId,
      metadata: { teamId, tokenType: "jwt" },
    });
  }

  // Set context
  c.set("userId", session.userId);
  c.set("teamId", session.teamId);
  c.set("session", session);
  c.set("supabaseAdmin", createAdminClient());

  // Log API key usage after request completion
  if (session.type === "api_key" && session.apiKey) {
    const originalNext = next;
    const wrappedNext = async () => {
      try {
        await originalNext();
      } finally {
        // Log usage after response
        const startTime = c.get("apiKeyUsageStart") as number;
        const responseTime = Date.now() - startTime;

        await apiKeyService
          .logUsage(session.apiKey!.id, session.teamId, {
            endpoint: c.req.path,
            method: c.req.method,
            statusCode: c.res.status || 200,
            ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
            userAgent: c.req.header("user-agent"),
            responseTimeMs: responseTime,
          })
          .catch((err) => {
            console.error("Failed to log API key usage:", err);
          });
      }
    };

    return wrappedNext();
  }

  return next();
};

// Scope validation middleware
export const requireScopes = (requiredScopes: string[]): MiddlewareHandler<ApiEnv> => {
  return async (c, next) => {
    const session = c.get("session") as AuthSession;

    // JWT tokens have full access (backward compatibility)
    if (session.type === "jwt") {
      return next();
    }

    // Check if API key has required scopes
    if (session.type === "api_key") {
      const userScopes = session.scopes || [];
      const hasAllScopes = requiredScopes.every((scope) => userScopes.includes(scope));

      if (!hasAllScopes) {
        const missingScopes = requiredScopes.filter((scope) => !userScopes.includes(scope));

        await trackAuthEvent({
          event: "SignIn.Failed",
          userId: session.userId,
          error: "Insufficient permissions",
          errorType: "insufficient_scopes",
          metadata: {
            required: requiredScopes,
            granted: userScopes,
            missing: missingScopes,
          },
        });

        return c.json(
          {
            error: "Insufficient permissions",
            required: requiredScopes,
            granted: userScopes,
            missing: missingScopes,
          },
          403
        );
      }
    }

    return next();
  };
};

// Enhanced middleware with rate limiting
export const requireAuthTeamWithRateLimit: MiddlewareHandler<ApiEnv> = async (c, next) => {
  // Apply rate limiting first
  await RateLimiters.authenticated(c, next);

  // Then apply auth
  return requireAuthTeam(c, async () => {
    await next();
  });
};
