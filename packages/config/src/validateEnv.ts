import { exit } from "node:process";
import { z } from "zod";

/**
 * Production-ready environment variable validation
 * Implements fail-fast behavior and comprehensive validation
 */

// Define comprehensive environment schema
const envSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(["development", "production", "test"]).default("development"),

  // Server configuration
  PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default("8080"),
  API_PORT: z
    .string()
    .transform((val) => parseInt(val, 10))
    .pipe(z.number().int().min(1).max(65535))
    .default("3001")
    .optional(),
  WEBHOOK_URL: z.string().url().optional(),

  // Critical API keys - must be present
  // Telegram removed from core config; add back if provider is enabled

  GOOGLE_API_KEY: z.string().min(20).startsWith("AIza", {
    message: "Invalid Google API key format. Must start with 'AIza'",
  }),

  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(20).startsWith("AIza", {
    message: "Invalid Google Generative AI API key format. Must start with 'AIza'",
  }),

  // Third-party service API keys
  FIRECRAWL_API_KEY: z.string().min(10).startsWith("fc-", {
    message: "Invalid Firecrawl API key format. Must start with 'fc-'",
  }),

  // Invoice Generator removed

  SUPABASE_URL: z.string().url({
    message: "SUPABASE_URL must be a valid URL",
  }),

  SUPABASE_SERVICE_ROLE_KEY: z.string().min(30, {
    message: "SUPABASE_SERVICE_ROLE_KEY must be provided and appear valid",
  }),

  SUPABASE_ANON_KEY: z
    .string()
    .min(30, {
      message: "SUPABASE_ANON_KEY must be provided and appear valid",
    })
    .optional(),

  NEXT_PUBLIC_SUPABASE_URL: z
    .string()
    .url({
      message: "NEXT_PUBLIC_SUPABASE_URL must be a valid URL",
    })
    .optional(),

  NEXT_PUBLIC_SUPABASE_ANON_KEY: z
    .string()
    .min(30, {
      message: "NEXT_PUBLIC_SUPABASE_ANON_KEY must be provided and appear valid",
    })
    .optional(),

  SUPABASE_DB_URL: z
    .string()
    .min(10, {
      message: "SUPABASE_DB_URL must be provided for database migrations",
    })
    .optional(),

  // Notion removed from core config

  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: z.string().min(1, {
    message: "CLOUDINARY_CLOUD_NAME is required",
  }),

  CLOUDINARY_API_KEY: z.string().min(10, {
    message: "CLOUDINARY_API_KEY must be at least 10 characters",
  }),

  CLOUDINARY_API_SECRET: z.string().min(10, {
    message: "CLOUDINARY_API_SECRET must be at least 10 characters",
  }),

  // Notion database IDs removed

  // Communications providers (optional per deployment)
  TWILIO_ACCOUNT_SID: z.string().min(10).optional(),
  TWILIO_AUTH_TOKEN: z.string().min(10).optional(),
  TWILIO_SIGNING_KEY: z.string().min(10).optional(),

  META_APP_ID: z.string().min(5).optional(),
  META_APP_SECRET: z.string().min(10).optional(),
  META_VERIFY_TOKEN: z.string().min(6).optional(),
  META_WEBHOOK_SECRET: z.string().min(10).optional(),
  META_APP_ACCESS_TOKEN: z.string().min(10).optional(),

  WHATSAPP_VERIFY_TOKEN: z.string().optional(),
  WHATSAPP_ACCESS_TOKEN: z.string().optional(),

  // Baileys session encryption key
  BAILLEYS_ENCRYPTION_KEY: z.string().min(16).optional(),

  // Quiet hours default HH:MM-HH:MM
  QUIET_HOURS_DEFAULT: z
    .string()
    .regex(/^\d{2}:\d{2}-\d{2}:\d{2}$/)
    .optional(),
}); // Allow unknown environment variables (system vars)

// Infer TypeScript type from schema
export type EnvConfig = z.infer<typeof envSchema>;

// Global validated environment configuration
let validatedEnv: EnvConfig | null = null;

/**
 * Validate environment variables with comprehensive error reporting
 * Implements fail-fast behavior for production safety
 */
export function validateEnvironmentVariables(): EnvConfig {
  if (validatedEnv) {
    return validatedEnv;
  }

  console.log("🔍 Validating environment variables...");

  try {
    // Parse and validate environment variables
    const result = envSchema.safeParse(process.env);

    if (!result.success) {
      console.error("❌ Environment validation failed!\n");

      // Group errors by type for better readability
      const missingVars: string[] = [];
      const invalidFormatVars: string[] = [];
      const otherErrors: string[] = [];

      result.error.issues.forEach((issue) => {
        const varName = issue.path.join(".");
        const message = issue.message;

        if (issue.code === "invalid_type" && issue.received === "undefined") {
          missingVars.push(`${varName}: Required environment variable is missing`);
        } else if (
          message.includes("Invalid") ||
          message.includes("format") ||
          message.includes("must")
        ) {
          invalidFormatVars.push(`${varName}: ${message}`);
        } else {
          otherErrors.push(`${varName}: ${message}`);
        }
      });

      // Display categorized errors
      if (missingVars.length > 0) {
        console.error("🚨 MISSING REQUIRED VARIABLES:");
        for (const err of missingVars) console.error(`   ${err}`);
        console.error("");
      }

      if (invalidFormatVars.length > 0) {
        console.error("⚠️  INVALID FORMAT/VALUES:");
        for (const err of invalidFormatVars) console.error(`   ${err}`);
        console.error("");
      }

      if (otherErrors.length > 0) {
        console.error("❓ OTHER VALIDATION ERRORS:");
        for (const err of otherErrors) console.error(`   ${err}`);
        console.error("");
      }

      console.error("💡 SETUP HELP:");
      console.error("   1. Copy .env.example to .env");
      console.error("   2. Fill in all required values");
      console.error("   3. Ensure API keys have correct formats");
      console.error("   4. Verify database IDs are valid UUIDs");
      console.error("");
      console.error("   Example .env structure:");
      console.error("   GOOGLE_API_KEY=AIza...");
      // Notion removed
      console.error("");

      // Exit immediately in production
      if (process.env.NODE_ENV === "production") {
        console.error("💥 PRODUCTION STARTUP ABORTED - Environment validation failed");
        exit(1);
      } else {
        console.error("🛑 DEVELOPMENT STARTUP ABORTED - Fix environment variables to continue");
        exit(1);
      }
    }

    validatedEnv = result.data;

    if (!validatedEnv.NEXT_PUBLIC_SUPABASE_URL) {
      validatedEnv = {
        ...validatedEnv,
        NEXT_PUBLIC_SUPABASE_URL: validatedEnv.SUPABASE_URL,
      };
      process.env.NEXT_PUBLIC_SUPABASE_URL = validatedEnv.SUPABASE_URL;
    }

    if (!validatedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY && validatedEnv.SUPABASE_ANON_KEY) {
      validatedEnv = {
        ...validatedEnv,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: validatedEnv.SUPABASE_ANON_KEY,
      };
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY = validatedEnv.SUPABASE_ANON_KEY;
    }

    // Success message with important info (without exposing secrets)
    console.log("✅ Environment validation passed");
    console.log(`   Environment: ${validatedEnv.NODE_ENV}`);
    console.log(`   Server port: ${validatedEnv.PORT}`);
    if ((validatedEnv as any).API_PORT) {
      console.log(`   API port: ${(validatedEnv as any).API_PORT}`);
    }
    console.log(`   Webhook configured: ${validatedEnv.WEBHOOK_URL ? "Yes" : "No"}`);
    console.log(`   API keys loaded: ${getLoadedApiKeysCount()} keys`);
    console.log("");

    return validatedEnv;
  } catch (error) {
    console.error("💥 Unexpected error during environment validation:", error);
    exit(1);
  }
}

/**
 * Get validated environment configuration
 * Must be called after validateEnvironmentVariables()
 */
export function getEnvConfig(): EnvConfig {
  if (!validatedEnv) {
    throw new Error(
      "Environment variables not validated. Call validateEnvironmentVariables() first.",
    );
  }
  return validatedEnv;
}

/**
 * Check if we're running in production
 */
export function isProduction(): boolean {
  const env = validatedEnv || { NODE_ENV: process.env.NODE_ENV || "development" };
  return env.NODE_ENV === "production";
}

/**
 * Check if we're running in development
 */
export function isDevelopment(): boolean {
  const env = validatedEnv || { NODE_ENV: process.env.NODE_ENV || "development" };
  return env.NODE_ENV === "development";
}

/**
 * Safely redact sensitive environment variables for logging
 * Never expose full API keys or secrets
 */
export function getRedactedEnvInfo(): Record<string, string> {
  if (!validatedEnv) {
    return { error: "Environment not validated" };
  }

  return {
    NODE_ENV: validatedEnv.NODE_ENV,
    PORT: validatedEnv.PORT.toString(),
    WEBHOOK_CONFIGURED: validatedEnv.WEBHOOK_URL ? "true" : "false",
    GOOGLE_API_KEY: redactSecret(validatedEnv.GOOGLE_API_KEY, 4, 4),
    FIRECRAWL_API_KEY: redactSecret(validatedEnv.FIRECRAWL_API_KEY, 4, 0),
    // Invoice Generator removed
    SUPABASE_URL: validatedEnv.SUPABASE_URL,
    SUPABASE_SERVICE_ROLE_KEY: redactSecret(validatedEnv.SUPABASE_SERVICE_ROLE_KEY, 4, 4),
    SUPABASE_ANON_KEY: validatedEnv.SUPABASE_ANON_KEY
      ? redactSecret(validatedEnv.SUPABASE_ANON_KEY, 4, 4)
      : "not-set",
    NEXT_PUBLIC_SUPABASE_URL: validatedEnv.NEXT_PUBLIC_SUPABASE_URL ?? "not-set",
    NEXT_PUBLIC_SUPABASE_ANON_KEY: validatedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY
      ? redactSecret(validatedEnv.NEXT_PUBLIC_SUPABASE_ANON_KEY, 4, 4)
      : "not-set",
    SUPABASE_DB_URL: validatedEnv.SUPABASE_DB_URL
      ? redactSecret(validatedEnv.SUPABASE_DB_URL, 8, 4)
      : "not-set",
    // Notion removed
    CLOUDINARY_CLOUD_NAME: validatedEnv.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: redactSecret(validatedEnv.CLOUDINARY_API_KEY, 4, 4),
    CLOUDINARY_API_SECRET: redactSecret(validatedEnv.CLOUDINARY_API_SECRET, 4, 4),
    DATABASE_IDS_LOADED: "0",
  };
}

/**
 * Utility function to redact secrets for safe logging
 * Shows first/last characters and masks the middle
 */
function redactSecret(secret: string, startChars: number = 4, endChars: number = 4): string {
  if (!secret || secret.length < startChars + endChars + 3) {
    return "***REDACTED***";
  }

  const start = secret.slice(0, startChars);
  const end = endChars > 0 ? secret.slice(-endChars) : "";
  const middle = "*".repeat(Math.max(3, secret.length - startChars - endChars));

  return `${start}${middle}${end}`;
}

/**
 * Count loaded API keys without exposing them
 */
function getLoadedApiKeysCount(): number {
  if (!validatedEnv) return 0;

  const apiKeys = [
    validatedEnv.GOOGLE_API_KEY,
    validatedEnv.GOOGLE_GENERATIVE_AI_API_KEY,
    validatedEnv.FIRECRAWL_API_KEY,
    // Invoice Generator removed,
    validatedEnv.SUPABASE_SERVICE_ROLE_KEY,
    validatedEnv.SUPABASE_ANON_KEY,
    validatedEnv.SUPABASE_DB_URL,
    // Notion removed
    validatedEnv.CLOUDINARY_API_KEY,
    validatedEnv.CLOUDINARY_API_SECRET,
  ];

  return apiKeys.filter((key) => key && key.length > 0).length;
}

/**
 * Create .env.example file for development setup
 * Should be called only in development mode
 */
export function createEnvExample(): void {
  if (isProduction()) {
    console.warn("⚠️  Cannot create .env.example in production mode");
    return;
  }

  const exampleContent = `# Google Gemini Configuration
GOOGLE_API_KEY=AIza-Your-Google-API-Key
GOOGLE_GENERATIVE_AI_API_KEY=AIza-Your-Google-Generative-AI-Key

# Third-party Services
FIRECRAWL_API_KEY=fc-your-firecrawl-key

# Supabase Configuration
SUPABASE_URL=https://your-project.supabase.co
SUPABASE_SERVICE_ROLE_KEY=your-service-role-key
SUPABASE_ANON_KEY=your-anon-key
NEXT_PUBLIC_SUPABASE_URL=https://your-project.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-anon-key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Server Configuration
NODE_ENV=development
PORT=8080
WEBHOOK_URL=https://your-domain.com/webhook

# API Server
API_PORT=3001

# Communications Providers (set in production or secrets manager)
# TWILIO_ACCOUNT_SID=
# TWILIO_AUTH_TOKEN=
# TWILIO_SIGNING_KEY=
# META_APP_ID=
# META_APP_SECRET=
# META_VERIFY_TOKEN=
# META_WEBHOOK_SECRET=
# META_APP_ACCESS_TOKEN=
# WHATSAPP_VERIFY_TOKEN=
# WHATSAPP_ACCESS_TOKEN=
# BAILLEYS_ENCRYPTION_KEY=

# Messaging defaults
QUIET_HOURS_DEFAULT=21:00-08:00

`;
  try {
    const fs = require("node:fs");
    fs.writeFileSync(".env.example", exampleContent);
    console.log("📄 Created .env.example file");
  } catch (error) {
    console.error("❌ Failed to create .env.example:", error);
  }
}
