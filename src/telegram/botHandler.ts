import { Bot, Context, MiddlewareFn } from 'grammy';

// Type definitions
interface GrammyContext extends Context {
  session: {
    intent?: string;
    data?: any;
    step?: number;
  };
}

// Simple session storage
const sessionStore = new Map<string, GrammyContext['session']>();

// Session middleware
const sessionMiddleware: MiddlewareFn<Context> = async (ctx, next) => {
  if (!ctx.chat?.id) return next();

  const sessionId = `${ctx.chat.id}`;

  // Initialize session if not exists
  if (!sessionStore.has(sessionId)) {
    sessionStore.set(sessionId, {});
  }

  // Attach session to context using type assertion
  const extendedCtx = ctx as GrammyContext;
  extendedCtx.session = sessionStore.get(sessionId)!;

  await next();
};

// API client for communicating with Mastra
class TelegramApiClient {
  private baseUrl: string;

  constructor(baseUrl: string = 'http://localhost:4111') {
    this.baseUrl = baseUrl;
  }

  async processMessage(text: string, userId: number, chatId: number, username?: string, messageId?: number) {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/process-message`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          text,
          userId,
          chatId,
          username,
          messageId: messageId || 0
        })
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || `HTTP ${response.status}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API call failed:', error);
      throw error;
    }
  }

  async checkHealth() {
    try {
      const response = await fetch(`${this.baseUrl}/api/telegram/health`);
      return response.ok;
    } catch {
      return false;
    }
  }
}

// Create bot instance with proper separation of concerns
export const createTelegramBot = (token: string): Bot<GrammyContext> => {
  const bot = new Bot(token);
  const apiClient = new TelegramApiClient();

  // Apply session middleware
  bot.use(sessionMiddleware);

  // Command handlers
  bot.command('start', async (ctx) => {
    const welcomeText = `
🎉 *Welcome to Cimantikós Clothing Company Bot!*

I'm here to help you with:
📄 Creating professional invoices
📏 Recording customer measurements
📋 Managing your orders

Just send me your order or measurement details in natural language, and I'll process them automatically!

**Examples:**
📝 Invoice: "Adwoa Noella Black kaftan : 1000cedis Ankara shirt 500cedis +233 24 135 7090"
📏 Measurements: "CH 39 ST 33 SL 23 SH 17 LT 27 Kofi"

Use /help for more information.
    `;

    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    const helpText = `
🤖 *Cimantikós Bot Help*

I can help you with two main tasks:

**📄 Invoice Creation:**
Send order details like:
"Customer Name
Item : Price cedis
Phone Number (optional)"

Example:
"Adwoa Noella
Black kaftan : 1000cedis
Ankara shirt : 500cedis
+233 24 135 7090"

**📏 Measurement Recording:**
Send measurements like:
"CH 39 ST 33 SL 23 Customer Name"

Available measurements:
• CH: Chest • ST: Stomach • SL: Sleeve
• SH: Shoulder • LT: Top Length • WT: Waist
• HP: Hip • RB: Bicep Round • NK: Neck

**Commands:**
/start - Welcome message
/help - This help message
/status - Check bot status

Just send me your details and I'll handle the rest! 🚀
    `;

    await ctx.reply(helpText, { parse_mode: 'Markdown' });
  });

  bot.command('status', async (ctx) => {
    const isHealthy = await apiClient.checkHealth();
    
    const statusText = isHealthy
      ? "✅ Bot is running normally and connected to AI services."
      : "⚠️ Bot is running but AI services may be temporarily unavailable.";
    
    await ctx.reply(statusText);
  });

  // Main message handler - processes all text messages via API
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const username = ctx.from.username;
    const messageId = ctx.message.message_id;

    try {
      // Show typing indicator
      await ctx.replyWithChatAction('typing');

      // Process message via API
      const response = await apiClient.processMessage(text, userId, chatId, username, messageId);

      if (response.success) {
        // Send the AI response back to user
        await ctx.reply(response.message, {
          parse_mode: 'Markdown',
          reply_to_message_id: messageId
        });

        // Log processing info (optional)
        if (response.metadata?.steps) {
          console.log(`Processed message for user ${userId}: ${response.metadata.steps} steps, ${response.metadata.usage?.totalTokens || 'unknown'} tokens`);
        }
      } else {
        await ctx.reply(
          "Sorry, I encountered an error processing your message. Please try again or contact support if the problem persists.",
          { reply_to_message_id: messageId }
        );
      }

    } catch (error) {
      console.error('Bot handler error:', error);
      
      await ctx.reply(
        "I'm temporarily unable to process your message. Please try again in a moment.",
        { reply_to_message_id: messageId }
      );
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};

export type { GrammyContext };