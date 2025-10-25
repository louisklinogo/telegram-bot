import { ApiKeyScopes, apiKeyService } from "@Faworra/auth/api-keys";
import { zValidator } from "@hono/zod-validator";
import { Hono } from "hono";
import { z } from "zod";
import type { ApiEnv } from "../../types/hono-env";
import { requireAuthTeam, requireScopes } from "../middleware/auth";

const app = new Hono<ApiEnv>();

const HTTP = {
  BAD_REQUEST: 400,
  CREATED: 201,
  NOT_FOUND: 404,
  INTERNAL_SERVER_ERROR: 500,
} as const;

const NAME_MIN = 1;
const NAME_MAX = 100;
const SCOPES_MIN = 1;
const EXPIRES_MIN_DAYS = 1;
const EXPIRES_MAX_DAYS = 365;
const SPECIAL_SCOPE_REGEX = /^(read|write|admin):/;

// Schema for creating API keys
const createApiKeySchema = z.object({
  name: z.string().min(NAME_MIN).max(NAME_MAX),
  scopes: z.array(z.string()).min(SCOPES_MIN),
  expiresInDays: z
    .number()
    .int()
    .min(EXPIRES_MIN_DAYS)
    .max(EXPIRES_MAX_DAYS)
    .optional()
    .default(EXPIRES_MAX_DAYS),
});

// Schema for updating API keys
const updateApiKeySchema = z.object({
  name: z.string().min(NAME_MIN).max(NAME_MAX).optional(),
  scopes: z.array(z.string()).min(SCOPES_MIN).optional(),
});

// List all available scopes
app.get("/scopes", requireAuthTeam, (c) => {
  const entries = Object.entries(ApiKeyScopes);
  const toObject = (es: [string, string][]) => Object.fromEntries(es);
  return c.json({
    scopes: ApiKeyScopes,
    categories: {
      read: toObject(entries.filter(([k]) => k.startsWith("read:"))),
      write: toObject(entries.filter(([k]) => k.startsWith("write:"))),
      admin: toObject(entries.filter(([k]) => k.startsWith("admin:"))),
      special: toObject(entries.filter(([k]) => !k.match(SPECIAL_SCOPE_REGEX))),
    },
  });
});

// Create a new API key
app.post(
  "/",
  requireAuthTeam,
  requireScopes(["admin:system"]), // Only admins can create API keys
  zValidator("json", createApiKeySchema),
  async (c) => {
    try {
      const { name, scopes, expiresInDays } = c.req.valid("json");
      const session = c.get("session");

      // Validate scopes
      const scopeValidation = apiKeyService.validateScopes(scopes);
      if (!scopeValidation.valid) {
        return c.json(
          {
            error: "Invalid scopes",
            invalid: scopeValidation.invalid,
          },
          HTTP.BAD_REQUEST
        );
      }

      // Check for duplicate name within team
      const existingKeys = await apiKeyService.listApiKeys(session.teamId);
      if (existingKeys.some((key) => key.name === name)) {
        return c.json(
          {
            error: "API key with this name already exists",
          },
          HTTP.BAD_REQUEST
        );
      }

      // Generate API key
      const apiKey = await apiKeyService.generateApiKey({
        teamId: session.teamId,
        userId: session.userId,
        name,
        scopes,
        expiresInDays,
      });

      // Return API key (token is only shown once)
      return c.json(
        {
          id: apiKey.id,
          name: apiKey.name,
          token: apiKey.token, // Only returned during creation
          scopes: apiKey.scopes,
          expiresAt: apiKey.expiresAt,
          createdAt: apiKey.createdAt,
          warning: "This token will only be shown once. Please save it securely.",
        },
        HTTP.CREATED
      );
    } catch (_error) {
      return c.json(
        {
          error: "Failed to create API key",
        },
        HTTP.INTERNAL_SERVER_ERROR
      );
    }
  }
);

// List API keys for the current team
app.get("/", requireAuthTeam, async (c) => {
  try {
    const session = c.get("session");
    const apiKeys = await apiKeyService.listApiKeys(session.teamId);

    return c.json({
      apiKeys: apiKeys.map((key) => ({
        id: key.id,
        name: key.name,
        scopes: key.scopes,
        lastUsedAt: key.lastUsedAt,
        expiresAt: key.expiresAt,
        revoked: key.revoked,
        createdAt: key.createdAt,
        updatedAt: key.updatedAt,
        // Never return hashedToken or token
      })),
    });
  } catch (_error) {
    return c.json(
      {
        error: "Failed to list API keys",
      },
      HTTP.INTERNAL_SERVER_ERROR
    );
  }
});

// Get specific API key details
app.get("/:id", requireAuthTeam, async (c) => {
  try {
    const apiKeyId = c.req.param("id");
    const session = c.get("session");

    const apiKeys = await apiKeyService.listApiKeys(session.teamId);
    const apiKey = apiKeys.find((key) => key.id === apiKeyId);

    if (!apiKey) {
      return c.json(
        {
          error: "API key not found",
        },
        HTTP.NOT_FOUND
      );
    }

    return c.json({
      id: apiKey.id,
      name: apiKey.name,
      scopes: apiKey.scopes,
      lastUsedAt: apiKey.lastUsedAt,
      expiresAt: apiKey.expiresAt,
      revoked: apiKey.revoked,
      createdAt: apiKey.createdAt,
      updatedAt: apiKey.updatedAt,
      user: apiKey.user,
    });
  } catch (_error) {
    return c.json(
      {
        error: "Failed to fetch API key",
      },
      HTTP.INTERNAL_SERVER_ERROR
    );
  }
});

// Update API key (name, scopes)
app.put(
  "/:id",
  requireAuthTeam,
  requireScopes(["admin:system"]),
  zValidator("json", updateApiKeySchema),
  async (c) => {
    try {
      const apiKeyId = c.req.param("id");
      const updates = c.req.valid("json");
      const session = c.get("session");

      // Check if API key exists and belongs to team
      const apiKeys = await apiKeyService.listApiKeys(session.teamId);
      const existingKey = apiKeys.find((key) => key.id === apiKeyId);

      if (!existingKey) {
        return c.json(
          {
            error: "API key not found",
          },
          HTTP.NOT_FOUND
        );
      }

      if (existingKey.revoked) {
        return c.json(
          {
            error: "Cannot update revoked API key",
          },
          HTTP.BAD_REQUEST
        );
      }

      // Validate scopes if provided
      if (updates.scopes) {
        const scopeValidation = apiKeyService.validateScopes(updates.scopes);
        if (!scopeValidation.valid) {
          return c.json(
            {
              error: "Invalid scopes",
              invalid: scopeValidation.invalid,
            },
            HTTP.BAD_REQUEST
          );
        }
      }

      // Check for name conflicts if name is being updated
      if (
        updates.name &&
        updates.name !== existingKey.name &&
        apiKeys.some((key) => key.name === updates.name && key.id !== apiKeyId)
      ) {
        return c.json(
          {
            error: "API key with this name already exists",
          },
          HTTP.BAD_REQUEST
        );
      }

      // Update API key
      await apiKeyService.updateApiKey(apiKeyId, updates);

      return c.json({
        message: "API key updated successfully",
        updated: updates,
      });
    } catch (_error) {
      return c.json(
        {
          error: "Failed to update API key",
        },
        HTTP.INTERNAL_SERVER_ERROR
      );
    }
  }
);

// Revoke API key
app.delete("/:id", requireAuthTeam, requireScopes(["admin:system"]), async (c) => {
  try {
    const apiKeyId = c.req.param("id");
    const session = c.get("session");

    // Check if API key exists and belongs to team
    const apiKeys = await apiKeyService.listApiKeys(session.teamId);
    const existingKey = apiKeys.find((key) => key.id === apiKeyId);

    if (!existingKey) {
      return c.json(
        {
          error: "API key not found",
        },
        HTTP.NOT_FOUND
      );
    }

    if (existingKey.revoked) {
      return c.json(
        {
          error: "API key is already revoked",
        },
        HTTP.BAD_REQUEST
      );
    }

    // Revoke API key
    await apiKeyService.revokeApiKey(apiKeyId);

    return c.json({
      message: "API key revoked successfully",
      revokedAt: new Date().toISOString(),
    });
  } catch (_error) {
    return c.json(
      {
        error: "Failed to revoke API key",
      },
      HTTP.INTERNAL_SERVER_ERROR
    );
  }
});

// Test API key endpoint - useful for debugging
app.get("/test/validate", requireAuthTeam, (c) => {
  const session = c.get("session");

  return c.json({
    message: "API key is valid",
    session: {
      type: session.type,
      userId: session.userId,
      teamId: session.teamId,
      scopes: session.scopes,
    },
    timestamp: new Date().toISOString(),
  });
});

export default app;
