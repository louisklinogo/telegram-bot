import "dotenv/config";
import { getEnvConfig, getRedactedEnvInfo, validateEnvironmentVariables } from "@cimantikos/config";
import { configureCloudinary } from "@cimantikos/services";
import { serve } from "@hono/node-server";
import { webhookCallback } from "grammy";
import { Hono } from "hono";
import { telegramApi } from "./api/telegramApi";
import { mastra } from "./mastra/index";
import { setBotInstance } from "./mastra/tools/grammyHandler";
import { createTelegramBot } from "./telegram/botHandler";

// Validate environment variables first - fail fast if invalid
const env = validateEnvironmentVariables();

// Configure Cloudinary with validated environment variables
configureCloudinary();

// Create separate Hono app for main server
const app = new Hono();

// Create Telegram bot instance using validated environment
const bot = createTelegramBot(env.TELEGRAM_BOT_TOKEN);

// Initialize bot instance for grammyHandler and pdfSender tools
setBotInstance(bot);

// Mount Telegram API routes
app.route("/api/telegram", telegramApi);

// Main health check endpoint
app.get("/health", (c) => {
  return c.json({
    status: "healthy",
    timestamp: new Date().toISOString(),
    services: {
      telegram_bot: "running",
      mastra_agents: "running",
      api: "running",
    },
  });
});

// Webhook endpoint for Telegram with timeout protection
app.post("/webhook", async (c) => {
  const startTime = Date.now();

  try {
    const body = await c.req.json();

    // Log incoming update info for debugging
    if (body.message) {
      const msg = body.message;
      console.log(
        `📨 Webhook: ${msg.chat?.type || "unknown"} ${msg.chat?.id} - ${msg.from?.username || "unknown"} (${msg.from?.id})`,
      );
      if (msg.text)
        console.log(`   Text: ${msg.text.slice(0, 50)}${msg.text.length > 50 ? "..." : ""}`);
      if (msg.photo) console.log(`   Photo: ${msg.photo.length} sizes`);
      if (msg.document) console.log(`   Document: ${msg.document.file_name}`);
    }

    // Verify the webhook secret if configured
    if (env.TELEGRAM_WEBHOOK_SECRET) {
      const signature = c.req.header("X-Telegram-Bot-Api-Secret-Token");
      if (signature !== env.TELEGRAM_WEBHOOK_SECRET) {
        console.warn(
          "⚠️  Invalid webhook signature from",
          c.req.header("X-Real-IP") || "unknown IP",
        );
        return c.json({ error: "Invalid signature" }, 401);
      }
    }

    // Handle the update with Grammy (Grammy handles its own timeout)
    await webhookCallback(bot, "hono")(c);

    const processingTime = Date.now() - startTime;
    console.log(`✅ Webhook processed in ${processingTime}ms`);

    return c.json({ ok: true });
  } catch (error) {
    console.error("Webhook error:", error);
    return c.json({ ok: true }); // Return OK to prevent excessive retries from Telegram
  }
});

// Webhook setup endpoint
app.post("/set-webhook", async (c) => {
  try {
    const { url, secret_token } = await c.req.json();

    if (!url) {
      return c.json({ error: "URL is required" }, 400);
    }

    // Validate webhook URL format
    if (!url.startsWith("https://")) {
      return c.json({ error: "Webhook URL must use HTTPS" }, 400);
    }

    const result = await bot.api.setWebhook(url, {
      secret_token: secret_token || env.TELEGRAM_WEBHOOK_SECRET,
    });

    return c.json({ success: true, result });
  } catch (error) {
    console.error("Set webhook error:", error);
    return c.json({ error: "Failed to set webhook" }, 500);
  }
});

// Remove webhook endpoint
app.post("/remove-webhook", async (c) => {
  try {
    const result = await bot.api.deleteWebhook();
    return c.json({ success: true, result });
  } catch (error) {
    console.error("Remove webhook error:", error);
    return c.json({ error: "Failed to remove webhook" }, 500);
  }
});

// Get webhook info endpoint
app.get("/webhook-info", async (c) => {
  try {
    const webhookInfo = await bot.api.getWebhookInfo();
    return c.json(webhookInfo);
  } catch (error) {
    console.error("Get webhook info error:", error);
    return c.json({ error: "Failed to get webhook info" }, 500);
  }
});

// Manual message sending endpoint (for testing)
app.post("/send-message", async (c) => {
  try {
    const { chat_id, text, parse_mode } = await c.req.json();

    if (!chat_id || !text) {
      return c.json({ error: "chat_id and text are required" }, 400);
    }

    const message = await bot.api.sendMessage(chat_id, text, { parse_mode });
    return c.json({ success: true, message });
  } catch (error) {
    console.error("Send message error:", error);
    return c.json({ error: "Failed to send message" }, 500);
  }
});

// Start the main Telegram bot server
const mainPort = env.PORT;

console.log(`🚀 Starting Cimantikós Telegram Bot Server...`);
console.log(`📡 Main server (Telegram webhooks): http://localhost:${mainPort}`);
console.log("");
console.log("🔒 Security Status:");
const redactedInfo = getRedactedEnvInfo();
console.log(`   Environment: ${redactedInfo.NODE_ENV}`);
console.log(
  `   Webhook secret: ${redactedInfo.WEBHOOK_CONFIGURED === "true" ? "Configured" : "Not set"}`,
);
console.log(
  `   API keys: ${Object.keys(redactedInfo).filter((k) => k.includes("_KEY")).length} loaded`,
);
console.log("");

// Start main server
serve({
  fetch: app.fetch,
  port: mainPort,
});

console.log(`✅ Main Telegram server is running!`);
console.log(`📊 Main health check: http://localhost:${mainPort}/health`);
console.log(`🔗 Telegram webhook: http://localhost:${mainPort}/webhook`);
console.log(`🤖 API endpoint: http://localhost:${mainPort}/api/telegram/process-message`);
console.log(`🧠 Agent status: http://localhost:${mainPort}/api/telegram/agent/status`);
console.log("");
console.log(
  '⚠️  IMPORTANT: You must also run "mastra dev" in a separate terminal for AI agents to work!',
);
console.log("🧠 Mastra server should be running on: http://localhost:4111");

// Set up webhook if URL is configured
if (env.WEBHOOK_URL) {
  setTimeout(async () => {
    try {
      console.log(`🔗 Setting up webhook to: ${env.WEBHOOK_URL}`);
      await bot.api.setWebhook(env.WEBHOOK_URL!, {
        secret_token: env.TELEGRAM_WEBHOOK_SECRET,
      });
      console.log("✅ Webhook configured successfully");
    } catch (error) {
      console.error("❌ Failed to set webhook:", error);
      console.error("   Make sure the webhook URL is accessible and uses HTTPS");
    }
  }, 2000); // Wait 2 seconds for server to start
} else {
  console.log("ℹ️  WEBHOOK_URL not configured. Webhook mode NOT active.");
  console.log("📋 To enable webhooks:");
  console.log("   1. Set WEBHOOK_URL in .env, OR");
  console.log("   2. Use POST /set-webhook endpoint with ngrok URL");
  console.log("🔧 For development testing, set up ngrok tunnel first!");
}
