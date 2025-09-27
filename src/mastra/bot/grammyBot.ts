import { Bot, Context, MiddlewareFn } from 'grammy';
import { setBotInstance, sendHelpMessage, sendSuccessMessage, sendErrorMessage } from '../tools/grammyHandler';
import { telegramInvoiceAgent } from '../agents/telegramInvoiceAgent';
import { InvoiceRequestSchema } from '../agents/types/invoice';
import { MeasurementDataSchema } from '../agents/types/measurement';
import { parseInvoiceText } from '../tools/invoiceGenerator';
import { parseMeasurementText } from '../tools/notionMeasurementsTool';

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

// Create bot instance
export const createGrammyBot = (token: string): Bot<GrammyContext> => {
  const bot = new Bot(token);

  // Set the global bot instance for tools
  setBotInstance(bot);

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

Use /help to see available commands and how to use me.

Let's get started! What would you like to do today?
    `;

    await ctx.reply(welcomeText, { parse_mode: 'Markdown' });
  });

  bot.command('help', async (ctx) => {
    await sendHelpMessage(ctx.chat.id);
  });

  bot.command('invoice', async (ctx) => {
    const grammyCtx = ctx as GrammyContext;
    if (!grammyCtx.session) return;
    grammyCtx.session.intent = 'invoice';
    grammyCtx.session.step = 1;
    grammyCtx.session.data = {};

    const instructions = `
📄 *New Invoice Creation*

Please send me the invoice details in this format:

\`Customer Name
Item 1 : Price cedis
Item 2 : Price cedis
Phone Number (optional)\`

Example:
\`Adwoa Noella
Black kaftan : 1000cedis
Ankara shirt 500cedis
+233 24 135 7090\`

Send your invoice details now or type /cancel to exit.
    `;

    await ctx.reply(instructions, { parse_mode: 'Markdown' });
  });

  bot.command('measurements', async (ctx) => {
    const grammyCtx = ctx as GrammyContext;
    if (!grammyCtx.session) return;
    grammyCtx.session.intent = 'measurement';
    grammyCtx.session.step = 1;
    grammyCtx.session.data = {};

    const instructions = `
📏 *New Measurement Recording*

Please send me the measurement details in this format:

\`CH value
ST value
SL value
Customer Name\`

Example:
\`CH 39
ST 33
SL 23
SH 17
LT 27
Kofi\`

Available abbreviations:
- CH: Chest
- ST: Stomach
- SL: Sleeve Length
- SH: Shoulder
- LT: Top Length
- WT: Waist
- HP: Hip
- LP: Lap
- RB: Bicep Round
- RD: Bicep Round (first) / Ankle Round (second)
- CF: Calf
- NK: Neck
- LB: Lap

Send your measurements now or type /cancel to exit.
    `;

    await ctx.reply(instructions, { parse_mode: 'Markdown' });
  });

  bot.command('cancel', async (ctx) => {
    const grammyCtx = ctx as GrammyContext;
    if (!grammyCtx.session) return;
    if (grammyCtx.session.intent) {
      grammyCtx.session.intent = undefined;
      grammyCtx.session.step = undefined;
      grammyCtx.session.data = undefined;

      await ctx.reply('✅ Operation cancelled. What would you like to do? Use /help for options.');
    } else {
      await ctx.reply('No active operation to cancel.');
    }
  });

  // Message handler
  bot.on('message:text', async (ctx) => {
    const text = ctx.message.text;
    const chatId = ctx.chat.id;

    // Check if user is in an active session
    if ((ctx as GrammyContext).session?.intent === 'invoice') {
      await handleInvoiceRequest(ctx as GrammyContext, text);
    } else if ((ctx as GrammyContext).session?.intent === 'measurement') {
      await handleMeasurementRequest(ctx as GrammyContext, text);
    } else {
      // Try to automatically detect intent
      await handleAutomaticDetection(ctx as GrammyContext, text);
    }
  });

  return bot;
};

// Handle invoice requests
async function handleInvoiceRequest(ctx: GrammyContext, text: string) {
  const chatId = ctx.chat?.id;

  try {
    // Parse the invoice text
    const parsedData = parseInvoiceText(text);

    // Validate required fields
    if (!parsedData.customer_name || !parsedData.items || parsedData.items.length === 0) {
      await ctx.reply('❌ I couldn\'t find a customer name or items. Please check the format and try again:');
      await ctx.reply('Customer Name\nItem : Price cedis\nPhone Number');
      return;
    }

    await ctx.reply('📝 Processing your invoice request...');

    // Use the agent to process the invoice
    const response = await telegramInvoiceAgent.generate(`
    Process this invoice request and create an invoice in Notion:

    Customer: ${parsedData.customer_name}
    Phone: ${parsedData.phone_number || 'Not provided'}
    Items: ${parsedData.items.map(item => `${item.name} - GHS ${item.unit_cost}`).join(', ')}

    Total: GHS ${parsedData.items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0)}
    `);

    // Send confirmation
    await sendSuccessMessage(chatId, `Invoice created successfully for ${parsedData.customer_name}!`);

    // Reset session
    ctx.session!.intent = undefined;
    ctx.session!.step = undefined;
    ctx.session!.data = undefined;

  } catch (error) {
    console.error('Error handling invoice request:', error);
    await sendErrorMessage(chatId, 'Sorry, I encountered an error while processing your invoice. Please try again.');
  }
}

// Handle measurement requests
async function handleMeasurementRequest(ctx: GrammyContext, text: string) {
  const chatId = ctx.chat?.id;

  try {
    // Parse the measurement text
    const parsedData = parseMeasurementText(text);

    // Validate required fields
    if (!parsedData.customer_name || Object.keys(parsedData.measurements).length === 0) {
      await ctx.reply('❌ I couldn\'t find a customer name or measurements. Please check the format and try again:');
      await ctx.reply('CH value\nST value\nCustomer Name');
      return;
    }

    await ctx.reply('📏 Recording your measurements...');

    // Use the agent to process the measurements
    const response = await telegramInvoiceAgent.generate(`
    Process this measurement request and record it in Notion:

    Customer: ${parsedData.customer_name}
    Measurements: ${Object.entries(parsedData.measurements).map(([key, value]) => `${key}: ${value}`).join(', ')}
    `);

    // Send confirmation
    await sendSuccessMessage(chatId, `Measurements recorded successfully for ${parsedData.customer_name}!`);

    // Reset session
    ctx.session!.intent = undefined;
    ctx.session!.step = undefined;
    ctx.session!.data = undefined;

  } catch (error) {
    console.error('Error handling measurement request:', error);
    await sendErrorMessage(chatId, 'Sorry, I encountered an error while recording your measurements. Please try again.');
  }
}

// Handle automatic intent detection
async function handleAutomaticDetection(ctx: GrammyContext, text: string) {
  const chatId = ctx.chat?.id;

  try {
    // Use the agent to detect intent and process the message
    const response = await telegramInvoiceAgent.generate(`
    Analyze this Telegram message and determine if it's an invoice request or measurement request:

    Message: "${text}"

    If it's an invoice request, extract customer name, items, and prices.
    If it's a measurement request, extract customer name and measurements.
    If it's unclear, ask for clarification.
    `);

    // The agent will handle the response automatically through its tools

  } catch (error) {
    console.error('Error in automatic detection:', error);
    await sendErrorMessage(chatId, 'I\'m not sure what you\'d like to do. Use /help to see available commands.');
  }
}