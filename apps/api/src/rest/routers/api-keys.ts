import { Hono } from "hono";
import { z } from "zod";
import { zValidator } from "@hono/zod-validator";
import { apiKeyService, ApiKeyScopes } from "@Faworra/auth/api-keys";
import { requireAuthTeam, requireScopes } from "../middleware/auth";
import type { ApiEnv } from "../../types/hono-env";

const app = new Hono<ApiEnv>();

// Schema for creating API keys
const createApiKeySchema = z.object({
  name: z.string().min(1).max(100),
  scopes: z.array(z.string()).min(1),
  expiresInDays: z.number().int().min(1).max(365).optional().default(365),
});

// Schema for updating API keys
const updateApiKeySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  scopes: z.array(z.string()).min(1).optional(),
});

// List all available scopes
app.get("/scopes", requireAuthTeam, async (c) => {
  return c.json({
    scopes: ApiKeyScopes,
    categories: {
      read: Object.entries(ApiKeyScopes)
        .filter(([key]) => key.startsWith("read:"))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      write: Object.entries(ApiKeyScopes)
        .filter(([key]) => key.startsWith("write:"))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      admin: Object.entries(ApiKeyScopes)
        .filter(([key]) => key.startsWith("admin:"))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
      special: Object.entries(ApiKeyScopes)
        .filter(([key]) => !key.match(/^(read|write|admin):/))
        .reduce((acc, [key, value]) => ({ ...acc, [key]: value }), {}),
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
        return c.json({
          error: "Invalid scopes",
          invalid: scopeValidation.invalid,
        }, 400);
      }

      // Check for duplicate name within team
      const existingKeys = await apiKeyService.listApiKeys(session.teamId);
      if (existingKeys.some(key => key.name === name)) {
        return c.json({
          error: "API key with this name already exists",
        }, 400);
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
      return c.json({
        id: apiKey.id,
        name: apiKey.name,
        token: apiKey.token, // Only returned during creation
        scopes: apiKey.scopes,
        expiresAt: apiKey.expiresAt,
        createdAt: apiKey.createdAt,
        warning: "This token will only be shown once. Please save it securely.",
      }, 201);

    } catch (error) {
      console.error("API key creation error:", error);
      return c.json({
        error: "Failed to create API key",
      }, 500);
    }
  }
);

// List API keys for the current team
app.get("/", requireAuthTeam, async (c) => {
  try {
    const session = c.get("session");
    const apiKeys = await apiKeyService.listApiKeys(session.teamId);

    return c.json({
      apiKeys: apiKeys.map(key => ({
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

  } catch (error) {
    console.error("API key listing error:", error);
    return c.json({
      error: "Failed to list API keys",
    }, 500);
  }
});

// Get specific API key details
app.get("/:id", requireAuthTeam, async (c) => {
  try {
    const apiKeyId = c.req.param("id");
    const session = c.get("session");

    const apiKeys = await apiKeyService.listApiKeys(session.teamId);
    const apiKey = apiKeys.find(key => key.id === apiKeyId);

    if (!apiKey) {
      return c.json({
        error: "API key not found",
      }, 404);
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

  } catch (error) {
    console.error("API key fetch error:", error);
    return c.json({
      error: "Failed to fetch API key",
    }, 500);
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
      const existingKey = apiKeys.find(key => key.id === apiKeyId);

      if (!existingKey) {
        return c.json({
          error: "API key not found",
        }, 404);
      }

      if (existingKey.revoked) {
        return c.json({
          error: "Cannot update revoked API key",
        }, 400);
      }

      // Validate scopes if provided
      if (updates.scopes) {
        const scopeValidation = apiKeyService.validateScopes(updates.scopes);
        if (!scopeValidation.valid) {
          return c.json({
            error: "Invalid scopes",
            invalid: scopeValidation.invalid,
          }, 400);
        }
      }

      // Check for name conflicts if name is being updated
      if (updates.name && updates.name !== existingKey.name) {
        if (apiKeys.some(key => key.name === updates.name && key.id !== apiKeyId)) {
          return c.json({
            error: "API key with this name already exists",
          }, 400);
        }
      }

      // Update API key
      await apiKeyService.updateApiKey(apiKeyId, updates);

      return c.json({
        message: "API key updated successfully",
        updated: updates,
      });

    } catch (error) {
      console.error("API key update error:", error);
      return c.json({
        error: "Failed to update API key",
      }, 500);
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
    const existingKey = apiKeys.find(key => key.id === apiKeyId);

    if (!existingKey) {
      return c.json({
        error: "API key not found",
      }, 404);
    }

    if (existingKey.revoked) {
      return c.json({
        error: "API key is already revoked",
      }, 400);
    }

    // Revoke API key
    await apiKeyService.revokeApiKey(apiKeyId);

    return c.json({
      message: "API key revoked successfully",
      revokedAt: new Date().toISOString(),
    });

  } catch (error) {
    console.error("API key revocation error:", error);
    return c.json({
      error: "Failed to revoke API key",
    }, 500);
  }
});

// Test API key endpoint - useful for debugging
app.get("/test/validate", requireAuthTeam, async (c) => {
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