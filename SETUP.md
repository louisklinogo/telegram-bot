# Cimantikós Platform Setup Guide

## Environment Variables Setup

### How It Works

The application uses **dotenv** to automatically load environment variables from `.env` files. You don't need to manually export or set environment variables - dotenv handles it automatically when the app starts.

### Local Development Setup

1. **Copy the example file**:
   ```bash
   cp .env.example .env
   ```

2. **Fill in your actual credentials** in the `.env` file

3. **Run the app** - dotenv will automatically load the variables:
   ```bash
   bun run dev:bot      # Development mode
   bun run build:bot    # Build the app
   bun run start:bot    # Production mode
   ```

### Required Environment Variables

All required variables are documented in `.env.example`. Key variables include:

- **TELEGRAM_BOT_TOKEN**: Your Telegram bot token from @BotFather
- **SUPABASE_URL**: Your Supabase project URL
- **SUPABASE_SERVICE_ROLE_KEY**: Service role key for backend operations
- **SUPABASE_DB_URL**: PostgreSQL connection string
- **GOOGLE_API_KEY**: For Gemini AI integration
- **CLOUDINARY_***: For image upload/management
- **NOTION_***: (Optional) For Notion integration

## Security Best Practices

### ✅ DO:
- Keep `.env` files local only (already in `.gitignore`)
- Use different credentials for dev/staging/production
- Rotate credentials if they're ever exposed
- Use environment variables in production (not .env files)

### ❌ DON'T:
- Commit `.env` files to git
- Share `.env` files via email/chat
- Use production credentials in development
- Hardcode secrets in your code

## Production Deployment

For production, **DO NOT** use `.env` files. Instead, set environment variables directly in your hosting platform:

### Vercel
1. Go to Project Settings → Environment Variables
2. Add all required variables
3. Deploy

### Railway / Render / Cloud Run
1. Use the Variables/Secrets tab in your project
2. Add all required variables
3. Deploy

### Docker
Pass environment variables using:
```bash
docker run -e TELEGRAM_BOT_TOKEN=xxx -e SUPABASE_URL=xxx ...
```

Or use docker-compose with env_file (but keep .env out of version control)

## Testing the Setup

Run this to verify your environment is configured correctly:

```bash
bun run start:bot
```

You should see:
```
✅ Environment validation passed
   Environment: development
   Server port: 8080
   Webhook configured: Yes
   API keys loaded: 11 keys
```

## Troubleshooting

### "Required environment variable is missing"
- Check that all required variables from `.env.example` are in your `.env`
- Make sure `.env` is in the project root
- Verify no typos in variable names

### "dotenv is not working"
- The app automatically loads `.env` via `import "dotenv/config"`
- No manual export or setup needed
- dotenv package is already installed (v16.4.5)

## Monorepo Structure

This is a monorepo with:
- `apps/telegram-bot` - Main Telegram bot application
- `apps/admin` - Admin dashboard (Next.js)
- `packages/domain` - Shared domain models
- `packages/services` - Shared services (Supabase, Cloudinary, etc.)
- `packages/config` - Shared configuration & validation

The root `.env` file is used when running commands from the project root.
