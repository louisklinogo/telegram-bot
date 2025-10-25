import { AuthEvents, trackAuthEvent } from "@Faworra/analytics/auth-events";
import type { ApiKey } from "@Faworra/auth/api-keys";
import { apiKeyService } from "@Faworra/auth/api-keys";
import { RateLimiters } from "@Faworra/middleware/rate-limiter";
import type { Context, MiddlewareHandler } from "hono";
import { createAdminClient, createClient } from "../../services/supabase";
import type { ApiEnv } from "../../types/hono-env";
export type AuthSession = {
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
};

const HTTP = {
  OK: 200,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const BEARER_PREFIX = "Bearer ";

type AuthResult = { session: AuthSession } | { error: Response };

function getBearerToken(c: Context<ApiEnv>): string | undefined {
  const authHeader = c.req.header("authorization") || c.req.header("Authorization");
  return authHeader?.startsWith(BEARER_PREFIX)
    ? authHeader.slice(BEARER_PREFIX.length)
    : undefined;
}

async function authenticateApiKey(c: Context<ApiEnv>, token: string): Promise<AuthResult> {
  const validation = await apiKeyService.validateApiKey(token);
  if (!(validation.valid && validation.apiKey)) {
    await trackAuthEvent({
      event: "SignIn.Failed",
      error: validation.error || "Invalid API key",
      errorType: "invalid_api_key",
    });
    return {
      error: c.json(
        { error: "Invalid API key", details: validation.error },
        HTTP.UNAUTHORIZED
      ),
    };
  }

  const apiKey = validation.apiKey;
  await trackAuthEvent(AuthEvents.apiKeyUsed(apiKey.userId, apiKey.teamId, apiKey.scopes));
  c.set("apiKeyUsageStart", Date.now());
  c.set("apiKeyId", apiKey.id);

  const session: AuthSession = {
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

  return { session };
}

async function authenticateJwt(c: Context<ApiEnv>, token: string): Promise<AuthResult> {
  const supabase = createClient();
  const admin = createAdminClient();

  const { data: userRes, error: authErr } = await supabase.auth.getUser(token);
  if (authErr || !userRes?.user) {
    await trackAuthEvent({
      event: "SignIn.Failed",
      error: authErr?.message || "Invalid user token",
      errorType: "invalid_jwt",
    });
    return { error: c.json({ error: "Invalid token" }, HTTP.UNAUTHORIZED) };
  }

  const userId = userRes.user.id;
  const { data: uRow, error: uErr } = await admin
    .from("users")
    .select("current_team_id")
    .eq("id", userId)
    .maybeSingle<{ current_team_id: string | null }>();

  if (uErr) {
    return { error: c.json({ error: uErr.message }, HTTP.INTERNAL_SERVER_ERROR) };
  }

  const teamId = uRow?.current_team_id || null;
  if (!teamId) {
    await trackAuthEvent({
      event: "SignIn.Failed",
      userId,
      error: "No team selected",
      errorType: "no_team_selected",
    });
    return { error: c.json({ error: "No team selected" }, HTTP.FORBIDDEN) };
  }

  const session: AuthSession = {
    userId,
    teamId,
    user: {
      id: userId,
      email: userRes.user.email,
      fullName: userRes.user.user_metadata?.full_name,
    },
    type: "jwt",
  };

  await trackAuthEvent({
    event: "TokenRefresh",
    userId,
    metadata: { teamId, tokenType: "jwt" },
  });

  return { session };
}

export const requireAuthTeam: MiddlewareHandler<ApiEnv> = async (c, next) => {
  const token = getBearerToken(c);
  if (!token) {
    await trackAuthEvent({
      event: "SignIn.Failed",
      error: "Missing authorization header",
      errorType: "missing_token",
    });
    return c.json({ error: "Unauthorized" }, HTTP.UNAUTHORIZED);
  }

  const result = token.startsWith("faw_api_")
    ? await authenticateApiKey(c, token)
    : await authenticateJwt(c, token);

  if ("error" in result) {
    return result.error;
  }
  const { session } = result;

  c.set("userId", session.userId);
  c.set("teamId", session.teamId);
  c.set("session", session);
  c.set("supabaseAdmin", createAdminClient());
  try {
    const l = c.get("logger");
    if (l) {
      c.set(
        "logger",
        l.child({ userId: session.userId, teamId: session.teamId, authType: session.type })
      );
    }
  } catch (_err) {
    // ignore logger enrichment errors
  }

  if (session.type === "api_key" && session.apiKey) {
    const originalNext = next;
    const wrappedNext = async () => {
      try {
        await originalNext();
      } finally {
        const startTime = c.get("apiKeyUsageStart") as number;
        const responseTime = Date.now() - startTime;

        await apiKeyService
          .logUsage(session.apiKey!.id, session.teamId, {
            endpoint: c.req.path,
            method: c.req.method,
            statusCode: c.res.status || HTTP.OK,
            ipAddress: c.req.header("x-forwarded-for") || c.req.header("x-real-ip") || "unknown",
            userAgent: c.req.header("user-agent"),
            responseTimeMs: responseTime,
          })
          .catch(() => {
            // ignore logging errors
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
          HTTP.FORBIDDEN
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
