import { createTool } from '@mastra/core/tools';
import { z } from 'zod';
import { Bot, Context } from 'grammy';

// Global bot instance (will be initialized in the main application)
// Use generic constraint to allow different context types
let botInstance: Bot<Context> | null = null;

export const setBotInstance = <T extends Context>(bot: Bot<T>) => {
  // Safe type coercion - we only use bot.api which is compatible across context types
  botInstance = bot as unknown as Bot<Context>;
};

export const getBotInstance = () => botInstance;

export const grammyHandler = createTool({
  id: 'grammy-handler',
  description: 'Send messages through the Telegram bot',
  inputSchema: z.object({
    chat_id: z.number().describe('The chat ID to send the message to'),
    text: z.string().describe('The message text to send'),
    parse_mode: z.enum(['HTML', 'Markdown', 'MarkdownV2']).optional().describe('Optional parse mode for formatting'),
    reply_to_message_id: z.number().optional().describe('Optional message ID to reply to'),
    keyboard: z.any().optional().describe('Optional inline keyboard markup'),
  }),
  execute: async ({ context }, options) => {
    const { chat_id, text, parse_mode, reply_to_message_id, keyboard } = context;

    if (!botInstance) {
      throw new Error('Bot instance not initialized. Call setBotInstance first.');
    }

    try {
      const messageOptions: any = {};

      if (parse_mode) {
        messageOptions.parse_mode = parse_mode;
      }

      if (reply_to_message_id) {
        messageOptions.reply_to_message_id = reply_to_message_id;
      }

      if (keyboard) {
        messageOptions.reply_markup = keyboard;
      }

      const message = await botInstance?.api.sendMessage(chat_id, text, messageOptions);

      return {
        success: true,
        message_id: message.message_id,
        chat_id: message.chat.id,
        text: message.text,
        timestamp: message.date,
      };
    } catch (error) {
      console.error('Error sending Telegram message:', error);
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error occurred',
      };
    }
  },
});

// Helper functions for common message types
export const sendTextMessage = async (
  chat_id: number,
  text: string,
  options?: {
    parse_mode?: 'HTML' | 'Markdown' | 'MarkdownV2';
    reply_to_message_id?: number;
  }
) => {
  try {
    // grammyHandler is a constant created by createTool, so execute is guaranteed to exist
    const tool = grammyHandler as typeof grammyHandler & { execute: NonNullable<typeof grammyHandler.execute> };
    return await tool.execute({
      context: {
        chat_id,
        text,
        ...options,
      },
      runtimeContext: {} as any,
      suspend: async () => {},
    });
  } catch (error) {
    console.error('Error executing grammy handler:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error occurred',
    };
  }
};

export const sendSuccessMessage = async (chat_id: number, text: string) => {
  return sendTextMessage(chat_id, `✅ ${text}`);
};

export const sendErrorMessage = async (chat_id: number, text: string) => {
  return sendTextMessage(chat_id, `❌ ${text}`);
};

export const sendInfoMessage = async (chat_id: number, text: string) => {
  return sendTextMessage(chat_id, `ℹ️ ${text}`);
};

export const sendHelpMessage = async (chat_id: number) => {
  const helpText = `
🤖 *Cimantikós Clothing Company Bot*

I can help you with:
📄 *Creating Invoices*
Send me your order details like:
\`Adwoa Noella Black kaftan : 1000cedis Ankara shirt 500cedis +233 24 135 7090\`

📏 *Recording Measurements*
Send me measurement data like:
\`CH 39 ST 33 SL 23 SH 17 LT 27 Kofi\`

📋 *Available Commands:*
/start - Welcome message
/help - Show this help message
/invoice - Create new invoice
/measurements - Record measurements

💡 *Tips:*
- For invoices, include customer name, items with prices
- For measurements, include abbreviations (CH, ST, SL, etc.) and customer name
- Phone numbers are optional but helpful for customer service

Need assistance? Just ask!
  `;

  return sendTextMessage(chat_id, helpText, { parse_mode: 'Markdown' });
};