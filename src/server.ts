import 'dotenv/config';
import { validateEnvironmentVariables, getEnvConfig, getRedactedEnvInfo } from './config/validateEnv';
import { Hono } from 'hono';
import { serve } from '@hono/node-server';
import { mastra } from './mastra/index';
import { telegramApi } from './api/telegramApi';
import { createTelegramBot } from './telegram/botHandler';
import { webhookCallback } from 'grammy';

// Validate environment variables first - fail fast if invalid
const env = validateEnvironmentVariables();

// Create separate Hono app for main server
const app = new Hono();

// Create Telegram bot instance using validated environment
const bot = createTelegramBot(env.TELEGRAM_BOT_TOKEN);

// Mount Telegram API routes
app.route('/api/telegram', telegramApi);

// Main health check endpoint
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy', 
    timestamp: new Date().toISOString(),
    services: {
      telegram_bot: 'running',
      mastra_agents: 'running',
      api: 'running'
    }
  });
});

// Webhook endpoint for Telegram
app.post('/webhook', async (c) => {
  try {
    const body = await c.req.json();

    // Verify the webhook secret if configured
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const signature = c.req.header('X-Telegram-Bot-Api-Secret-Token');
      if (signature !== env.TELEGRAM_WEBHOOK_SECRET) {
        console.warn('⚠️  Invalid webhook signature from', c.req.header('X-Real-IP') || 'unknown IP');
        return c.json({ error: 'Invalid signature' }, 401);
      }
    }

    // Handle the update with Grammy
    await webhookCallback(bot, 'hono')(c);

    return c.json({ ok: true });
  } catch (error) {
    console.error('Webhook error:', error);
    return c.json({ error: 'Internal server error' }, 500);
  }
});

// Webhook setup endpoint
app.post('/set-webhook', async (c) => {
  try {
    const { url, secret_token } = await c.req.json();

    if (!url) {
      return c.json({ error: 'URL is required' }, 400);
    }

      // Validate webhook URL format
      if (!url.startsWith('https://')) {
        return c.json({ error: 'Webhook URL must use HTTPS' }, 400);
      }
      
      const result = await bot.api.setWebhook(url, {
        secret_token: secret_token || env.TELEGRAM_WEBHOOK_SECRET,
      });

    return c.json({ success: true, result });
  } catch (error) {
    console.error('Set webhook error:', error);
    return c.json({ error: 'Failed to set webhook' }, 500);
  }
});

// Remove webhook endpoint
app.post('/remove-webhook', async (c) => {
  try {
    const result = await bot.api.deleteWebhook();
    return c.json({ success: true, result });
  } catch (error) {
    console.error('Remove webhook error:', error);
    return c.json({ error: 'Failed to remove webhook' }, 500);
  }
});

// Get webhook info endpoint
app.get('/webhook-info', async (c) => {
  try {
    const webhookInfo = await bot.api.getWebhookInfo();
    return c.json(webhookInfo);
  } catch (error) {
    console.error('Get webhook info error:', error);
    return c.json({ error: 'Failed to get webhook info' }, 500);
  }
});

// Manual message sending endpoint (for testing)
app.post('/send-message', async (c) => {
  try {
    const { chat_id, text, parse_mode } = await c.req.json();

    if (!chat_id || !text) {
      return c.json({ error: 'chat_id and text are required' }, 400);
    }

    const message = await bot.api.sendMessage(chat_id, text, { parse_mode });
    return c.json({ success: true, message });
  } catch (error) {
    console.error('Send message error:', error);
    return c.json({ error: 'Failed to send message' }, 500);
  }
});

// Start both servers using validated configuration
const mainPort = env.PORT;
const mastraPort = 4111;

console.log(`🚀 Starting Cimantikós Telegram Bot servers...`);
console.log(`📡 Main server (Telegram webhooks): http://localhost:${mainPort}`);
console.log(`🧠 Mastra server (AI agents): http://localhost:${mastraPort}`);
console.log('');
console.log('🔒 Security Status:');
const redactedInfo = getRedactedEnvInfo();
console.log(`   Environment: ${redactedInfo.NODE_ENV}`);
console.log(`   Webhook secret: ${redactedInfo.WEBHOOK_CONFIGURED === 'true' ? 'Configured' : 'Not set'}`);
console.log(`   API keys: ${Object.keys(redactedInfo).filter(k => k.includes('_KEY')).length} loaded`);
console.log('');

// Start main server
serve({
  fetch: app.fetch,
  port: mainPort,
});

// Mastra server starts automatically with its configuration

console.log(`✅ All servers are running!`);
console.log(`📊 Main health check: http://localhost:${mainPort}/health`);
console.log(`🔗 Telegram webhook: http://localhost:${mainPort}/webhook`);
console.log(`🤖 API endpoint: http://localhost:${mainPort}/api/telegram/process-message`);
console.log(`🎯 Mastra playground: http://localhost:${mastraPort}`);
console.log(`🧠 Agent status: http://localhost:${mainPort}/api/telegram/agent/status`);

// Set up webhook if URL is configured
if (env.WEBHOOK_URL) {
  setTimeout(async () => {
    try {
      console.log(`🔗 Setting up webhook to: ${env.WEBHOOK_URL}`);
      await bot.api.setWebhook(env.WEBHOOK_URL!, {
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      });
      console.log('✅ Webhook configured successfully');
    } catch (error) {
      console.error('❌ Failed to set webhook:', error);
      console.error('   Make sure the webhook URL is accessible and uses HTTPS');
    }
  }, 2000); // Wait 2 seconds for server to start
} else {
  console.log('ℹ️  WEBHOOK_URL not configured. Running in polling mode for development.');
  console.log('📋 Set WEBHOOK_URL in .env for production deployment.');
  console.log('🔧 Use /set-webhook endpoint to configure webhook manually.');
}
