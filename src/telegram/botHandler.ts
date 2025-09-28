import { Bot, Context, MiddlewareFn } from 'grammy';
import { processImage, processDocument } from '../mastra/tools/fileHandler';

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

  constructor(baseUrl: string = 'http://localhost:8080') {
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
  const bot = new Bot<GrammyContext>(token);
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

Use /help for more information.
    `;

    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    const helpText = `
🤖 Cimantikós Bot Help

I can help you with two main tasks:

📄 Invoice Creation:
📏 Measurement Recording:
📁 File Support:

Commands:
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

  // Photo handler
  bot.on('message:photo', async (ctx) => {
    const photo = ctx.message.photo;
    const largestPhoto = photo[photo.length - 1]; // Get the largest resolution
    const caption = ctx.message.caption;
    const chatId = ctx.chat.id;
    
    // Validate inputs
    if (!largestPhoto || !largestPhoto.file_id) {
      console.error('Invalid photo data received');
      await ctx.reply('❌ Sorry, I couldn\'t process this image. Please try sending it again.');
      return;
    }
    
    if (!chatId || typeof chatId !== 'number') {
      console.error('Invalid chat ID');
      return;
    }
    
    console.log(`📷 Processing photo from chat ${chatId}, file_id: ${largestPhoto.file_id}`);
    
    try {
      await ctx.replyWithChatAction('upload_document');
      
      const result = await processImage(chatId, largestPhoto.file_id, caption);
      
      if (!result.success) {
        console.error('Image processing failed:', result.error);
        await ctx.reply('❌ Sorry, I had trouble processing your image. Please try again with a different image.');
        return;
      }
      
      // Let the agent know about the image
      const imageText = `[Image received and processed]${caption ? ` Caption: ${caption}` : ''}`;
      const userId = ctx.from?.id;
      const username = ctx.from?.username;
      const messageId = ctx.message.message_id;
      
      if (userId) {
        try {
          // Process through the agent with timeout
          const response = await Promise.race([
            apiClient.processMessage(imageText, userId, chatId, username, messageId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Agent processing timeout')), 8000)
            )
          ]) as any;
          
          if (response.success && response.message && response.message !== '✅ **File Processed**') {
            await ctx.reply(response.message);
          }
        } catch (agentError) {
          console.error('Agent processing error for image:', agentError);
          // Don't send error to user since file was processed successfully
        }
      }
      
    } catch (error) {
      console.error('Photo handler error:', error);
      await ctx.reply('❌ Sorry, I had trouble processing your image. Please try again.');
    }
  });
  
  // Document handler
  bot.on('message:document', async (ctx) => {
    const document = ctx.message.document;
    const caption = ctx.message.caption;
    const chatId = ctx.chat.id;
    
    // Validate inputs
    if (!document || !document.file_id) {
      console.error('Invalid document data received');
      await ctx.reply('❌ Sorry, I couldn\'t process this document. Please try sending it again.');
      return;
    }
    
    if (!chatId || typeof chatId !== 'number') {
      console.error('Invalid chat ID');
      return;
    }
    
    console.log(`📄 Processing document from chat ${chatId}, file_id: ${document.file_id}, name: ${document.file_name}`);
    
    try {
      await ctx.replyWithChatAction('upload_document');
      
      const result = await processDocument(chatId, document.file_id, document.file_name, caption);
      
      if (!result.success) {
        console.error('Document processing failed:', result.error);
        await ctx.reply('❌ Sorry, I had trouble processing your document. Please try again with a different file.');
        return;
      }
      
      // Let the agent know about the document
      const docText = `[Document received and processed: ${document.file_name || 'unknown'}]${caption ? ` Caption: ${caption}` : ''}`;
      const userId = ctx.from?.id;
      const username = ctx.from?.username;
      const messageId = ctx.message.message_id;
      
      if (userId) {
        try {
          // Process through the agent with timeout
          const response = await Promise.race([
            apiClient.processMessage(docText, userId, chatId, username, messageId),
            new Promise((_, reject) => 
              setTimeout(() => reject(new Error('Agent processing timeout')), 8000)
            )
          ]) as any;
          
          if (response.success && response.message && response.message !== '✅ **File Processed**') {
            await ctx.reply(response.message);
          }
        } catch (agentError) {
          console.error('Agent processing error for document:', agentError);
          // Don't send error to user since file was processed successfully
        }
      }
      
    } catch (error) {
      console.error('Document handler error:', error);
      await ctx.reply('❌ Sorry, I had trouble processing your document. Please try again.');
    }
  });

  // Main message handler - processes all text messages via API
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const userId = ctx.from.id;
    const chatId = ctx.chat.id;
    const username = ctx.from.username;
    const messageId = ctx.message.message_id;

    try {
      // Show typing indicator immediately
      await ctx.replyWithChatAction('typing');
      
      // For longer messages or measurement data, show processing status
      let processingMessage = null;
      const isMeasurementData = /[A-Z]{2}\s+\d+/.test(text) || text.length > 100;
      
      if (isMeasurementData) {
        const processingTimeout = setTimeout(async () => {
          try {
            const message = text.length > 100 && /[A-Z]{2}\s+\d+/.test(text) 
              ? '📍 Processing measurements and saving to database... This may take up to 20 seconds.'
              : '🤔 Processing your request... Please wait a moment.';
            processingMessage = await ctx.reply(message);
          } catch (e) {
            console.error('Failed to send processing message:', e);
          }
        }, 3000);
        
        // Clear the timeout if processing completes quickly
        const originalProcessMessage = apiClient.processMessage(text, userId, chatId, username, messageId);
        originalProcessMessage.finally(() => clearTimeout(processingTimeout));
      }
      
      // Process message via API with timeout protection
      const response = await Promise.race([
        apiClient.processMessage(text, userId, chatId, username, messageId),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Processing timeout')), 50000)
        )
      ]) as any;

      if (response.success) {
        // Send the AI response back to user with reply fallback
        try {
          await ctx.reply(response.message, {
            reply_to_message_id: messageId
          });
        } catch (replyError) {
          // Fallback: send without reply if original message not found
          await ctx.reply(response.message);
        }

        // Log processing info (optional)
        if (response.metadata?.steps) {
          console.log(`Processed message for user ${userId}: ${response.metadata.steps} steps, ${response.metadata.usage?.totalTokens || 'unknown'} tokens`);
        }
      } else {
        try {
          await ctx.reply(
            "Sorry, I encountered an error processing your message. Please try again or contact support if the problem persists.",
            { reply_to_message_id: messageId }
          );
        } catch (replyError) {
          await ctx.reply("Sorry, I encountered an error processing your message. Please try again or contact support if the problem persists.");
        }
      }
      
    } catch (error) {
      console.error('Bot handler error:', error);
      
      if (error.message === 'Processing timeout') {
        try {
          // Delete processing message if it exists
          if (processingMessage) {
            try {
              await bot.api.deleteMessage(chatId, processingMessage.message_id);
            } catch (e) {
              // Ignore deletion errors
            }
          }
          await ctx.reply("😅 Your request took longer than expected to process. For complex operations like invoices or measurements, please wait as workflows may still be running in the background. You'll receive a notification once complete!");
        } catch (replyError) {
          console.error('Failed to send timeout message:', replyError);
        }
      } else {
        try {
          await ctx.reply("I'm temporarily unable to process your message. Please try again in a moment.");
        } catch (replyError) {
          console.error('Failed to send error message:', replyError);
        }
      }
    }
  });

  // Error handler
  bot.catch((err) => {
    console.error('Bot error:', err);
  });

  return bot;
};

export type { GrammyContext };