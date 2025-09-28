import { z } from 'zod';
import { exit } from 'process';

/**
 * Production-ready environment variable validation
 * Implements fail-fast behavior and comprehensive validation
 */

// Define comprehensive environment schema
const envSchema = z.object({
  // Node.js environment
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  
  // Server configuration
  PORT: z.string().transform(val => parseInt(val, 10)).pipe(z.number().int().min(1).max(65535)).default('8080'),
  WEBHOOK_URL: z.string().url().optional(),
  TELEGRAM_WEBHOOK_SECRET: z.string().optional(),
  
  // Critical API keys - must be present
  TELEGRAM_BOT_TOKEN: z.string().min(10).regex(/^\d+:[A-Za-z0-9_-]+$/, {
    message: "Invalid Telegram bot token format. Expected format: 'number:alphanumeric_string'"
  }),
  
  GOOGLE_API_KEY: z.string().min(20).startsWith('AIza', {
    message: "Invalid Google API key format. Must start with 'AIza'"
  }),
  
  GOOGLE_GENERATIVE_AI_API_KEY: z.string().min(20).startsWith('AIza', {
    message: "Invalid Google Generative AI API key format. Must start with 'AIza'"
  }),
  
  // Third-party service API keys
  FIRECRAWL_API_KEY: z.string().min(10).startsWith('fc-', {
    message: "Invalid Firecrawl API key format. Must start with 'fc-'"
  }),
  
  INVOICE_GENERATOR_API_KEY: z.string().min(10).startsWith('sk_', {
    message: "Invalid Invoice Generator API key format. Must start with 'sk_'"
  }),
  
  NOTION_API_KEY: z.string().min(10).startsWith('ntn_', {
    message: "Invalid Notion API key format. Must start with 'ntn_'"
  }),
  
  // Cloudinary configuration
  CLOUDINARY_CLOUD_NAME: z.string().min(1, {
    message: "CLOUDINARY_CLOUD_NAME is required"
  }),
  
  CLOUDINARY_API_KEY: z.string().min(10, {
    message: "CLOUDINARY_API_KEY must be at least 10 characters"
  }),
  
  CLOUDINARY_API_SECRET: z.string().min(10, {
    message: "CLOUDINARY_API_SECRET must be at least 10 characters"
  }),
  
  // Notion database IDs - must be valid UUID format
  NOTION_CLIENTS_DB_ID: z.string().uuid({
    message: "NOTION_CLIENTS_DB_ID must be a valid UUID"
  }),
  
  NOTION_INVOICES_DB_ID: z.string().uuid({
    message: "NOTION_INVOICES_DB_ID must be a valid UUID"  
  }),
  
  NOTION_ORDERS_DB_ID: z.string().uuid({
    message: "NOTION_ORDERS_DB_ID must be a valid UUID"
  }),
  
  NOTION_MEASUREMENTS_DB_ID: z.string().uuid({
    message: "NOTION_MEASUREMENTS_DB_ID must be a valid UUID"
  }),
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

  console.log('🔍 Validating environment variables...');
  
  try {
    // Parse and validate environment variables
    const result = envSchema.safeParse(process.env);
    
    if (!result.success) {
      console.error('❌ Environment validation failed!\n');
      
      // Group errors by type for better readability
      const missingVars: string[] = [];
      const invalidFormatVars: string[] = [];
      const otherErrors: string[] = [];
      
      result.error.issues.forEach(issue => {
        const varName = issue.path.join('.');
        const message = issue.message;
        
        if (issue.code === 'invalid_type' && issue.received === 'undefined') {
          missingVars.push(`${varName}: Required environment variable is missing`);
        } else if (message.includes('Invalid') || message.includes('format') || message.includes('must')) {
          invalidFormatVars.push(`${varName}: ${message}`);
        } else {
          otherErrors.push(`${varName}: ${message}`);
        }
      });
      
      // Display categorized errors
      if (missingVars.length > 0) {
        console.error('🚨 MISSING REQUIRED VARIABLES:');
        missingVars.forEach(err => console.error(`   ${err}`));
        console.error('');
      }
      
      if (invalidFormatVars.length > 0) {
        console.error('⚠️  INVALID FORMAT/VALUES:');
        invalidFormatVars.forEach(err => console.error(`   ${err}`));
        console.error('');
      }
      
      if (otherErrors.length > 0) {
        console.error('❓ OTHER VALIDATION ERRORS:');
        otherErrors.forEach(err => console.error(`   ${err}`));
        console.error('');
      }
      
      console.error('💡 SETUP HELP:');
      console.error('   1. Copy .env.example to .env');
      console.error('   2. Fill in all required values');
      console.error('   3. Ensure API keys have correct formats');
      console.error('   4. Verify database IDs are valid UUIDs');
      console.error('');
      console.error('   Example .env structure:');
      console.error('   TELEGRAM_BOT_TOKEN=1234567890:AAAA...');
      console.error('   GOOGLE_API_KEY=AIza...');
      console.error('   NOTION_API_KEY=ntn_...');
      console.error('   NOTION_CLIENTS_DB_ID=550e8400-e29b-41d4-a716-446655440000');
      console.error('');
      
      // Exit immediately in production
      if (process.env.NODE_ENV === 'production') {
        console.error('💥 PRODUCTION STARTUP ABORTED - Environment validation failed');
        exit(1);
      } else {
        console.error('🛑 DEVELOPMENT STARTUP ABORTED - Fix environment variables to continue');
        exit(1);
      }
    }
    
    validatedEnv = result.data;
    
    // Success message with important info (without exposing secrets)
    console.log('✅ Environment validation passed');
    console.log(`   Environment: ${validatedEnv.NODE_ENV}`);
    console.log(`   Server port: ${validatedEnv.PORT}`);
    console.log(`   Webhook configured: ${validatedEnv.WEBHOOK_URL ? 'Yes' : 'No'}`);
    console.log(`   API keys loaded: ${getLoadedApiKeysCount()} keys`);
    console.log('');
    
    return validatedEnv;
    
  } catch (error) {
    console.error('💥 Unexpected error during environment validation:', error);
    exit(1);
  }
}

/**
 * Get validated environment configuration
 * Must be called after validateEnvironmentVariables()
 */
export function getEnvConfig(): EnvConfig {
  if (!validatedEnv) {
    throw new Error('Environment variables not validated. Call validateEnvironmentVariables() first.');
  }
  return validatedEnv;
}

/**
 * Check if we're running in production
 */
export function isProduction(): boolean {
  const env = validatedEnv || { NODE_ENV: process.env.NODE_ENV || 'development' };
  return env.NODE_ENV === 'production';
}

/**
 * Check if we're running in development
 */
export function isDevelopment(): boolean {
  const env = validatedEnv || { NODE_ENV: process.env.NODE_ENV || 'development' };
  return env.NODE_ENV === 'development';
}

/**
 * Safely redact sensitive environment variables for logging
 * Never expose full API keys or secrets
 */
export function getRedactedEnvInfo(): Record<string, string> {
  if (!validatedEnv) {
    return { error: 'Environment not validated' };
  }
  
  return {
    NODE_ENV: validatedEnv.NODE_ENV,
    PORT: validatedEnv.PORT.toString(),
    WEBHOOK_CONFIGURED: validatedEnv.WEBHOOK_URL ? 'true' : 'false',
    TELEGRAM_BOT_TOKEN: redactSecret(validatedEnv.TELEGRAM_BOT_TOKEN, 4, 4),
    GOOGLE_API_KEY: redactSecret(validatedEnv.GOOGLE_API_KEY, 4, 4),
    FIRECRAWL_API_KEY: redactSecret(validatedEnv.FIRECRAWL_API_KEY, 4, 0),
    INVOICE_GENERATOR_API_KEY: redactSecret(validatedEnv.INVOICE_GENERATOR_API_KEY, 4, 4),
    NOTION_API_KEY: redactSecret(validatedEnv.NOTION_API_KEY, 4, 4),
    CLOUDINARY_CLOUD_NAME: validatedEnv.CLOUDINARY_CLOUD_NAME,
    CLOUDINARY_API_KEY: redactSecret(validatedEnv.CLOUDINARY_API_KEY, 4, 4),
    CLOUDINARY_API_SECRET: redactSecret(validatedEnv.CLOUDINARY_API_SECRET, 4, 4),
    DATABASE_IDS_LOADED: '4 databases configured',
  };
}

/**
 * Utility function to redact secrets for safe logging
 * Shows first/last characters and masks the middle
 */
function redactSecret(secret: string, startChars: number = 4, endChars: number = 4): string {
  if (!secret || secret.length < startChars + endChars + 3) {
    return '***REDACTED***';
  }
  
  const start = secret.slice(0, startChars);
  const end = endChars > 0 ? secret.slice(-endChars) : '';
  const middle = '*'.repeat(Math.max(3, secret.length - startChars - endChars));
  
  return `${start}${middle}${end}`;
}

/**
 * Count loaded API keys without exposing them
 */
function getLoadedApiKeysCount(): number {
  if (!validatedEnv) return 0;
  
  const apiKeys = [
    validatedEnv.TELEGRAM_BOT_TOKEN,
    validatedEnv.GOOGLE_API_KEY,
    validatedEnv.GOOGLE_GENERATIVE_AI_API_KEY,
    validatedEnv.FIRECRAWL_API_KEY,
    validatedEnv.INVOICE_GENERATOR_API_KEY,
    validatedEnv.NOTION_API_KEY,
    validatedEnv.CLOUDINARY_API_KEY,
    validatedEnv.CLOUDINARY_API_SECRET,
  ];
  
  return apiKeys.filter(key => key && key.length > 0).length;
}

/**
 * Create .env.example file for development setup
 * Should be called only in development mode
 */
export function createEnvExample(): void {
  if (isProduction()) {
    console.warn('⚠️  Cannot create .env.example in production mode');
    return;
  }
  
  const exampleContent = `# Telegram Bot Configuration
TELEGRAM_BOT_TOKEN=1234567890:AAAA-Your-Bot-Token-Here
TELEGRAM_WEBHOOK_SECRET=optional-webhook-secret

# Google Gemini Configuration  
GOOGLE_API_KEY=AIza-Your-Google-API-Key
GOOGLE_GENERATIVE_AI_API_KEY=AIza-Your-Google-Generative-AI-Key

# Third-party Services
FIRECRAWL_API_KEY=fc-your-firecrawl-key
INVOICE_GENERATOR_API_KEY=sk_your-invoice-generator-key

# Notion Integration
NOTION_API_KEY=ntn_your-notion-api-key

# Cloudinary Configuration
CLOUDINARY_CLOUD_NAME=your-cloud-name
CLOUDINARY_API_KEY=your-api-key
CLOUDINARY_API_SECRET=your-api-secret

# Notion Database IDs (must be valid UUIDs)
NOTION_CLIENTS_DB_ID=550e8400-e29b-41d4-a716-446655440000
NOTION_INVOICES_DB_ID=550e8400-e29b-41d4-a716-446655440001  
NOTION_ORDERS_DB_ID=550e8400-e29b-41d4-a716-446655440002
NOTION_MEASUREMENTS_DB_ID=550e8400-e29b-41d4-a716-446655440003

# Server Configuration
NODE_ENV=development
PORT=8080
WEBHOOK_URL=https://your-domain.com/webhook
`;

  try {
    const fs = require('fs');
    fs.writeFileSync('.env.example', exampleContent);
    console.log('📄 Created .env.example file');
  } catch (error) {
    console.error('❌ Failed to create .env.example:', error);
  }
}