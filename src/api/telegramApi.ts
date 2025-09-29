import { Hono } from 'hono';
import { mastra } from '../mastra/index';
import { RuntimeContext } from '@mastra/core/runtime-context';
import { z } from 'zod';

const app = new Hono();

// Schema for telegram message processing
const TelegramMessageSchema = z.object({
  text: z.string().min(1).max(4000),
  userId: z.number(),
  chatId: z.number(),
  username: z.string().optional(),
  messageId: z.number(),
});

// Schema for API responses
const ApiResponseSchema = z.object({
  success: z.boolean(),
  message: z.string(),
  data: z.any().optional(),
  error: z.string().optional(),
});

// Process telegram message via Mastra agent
app.post('/process-message', async (c) => {
  try {
    const body = await c.req.json();
    const validatedInput = TelegramMessageSchema.parse(body);
    
    const { text, userId, chatId, username } = validatedInput;
    
    // Get Maya - Cimantikós Business Assistant from Mastra
    const agent = mastra.getAgent('cimantikosBizAssistant');
    
    // Generate response using agent with memory context and timeout protection
    const startTime = Date.now();
    console.log(`🤖 Starting agent processing for user ${userId}`);
    
    const response = await Promise.race([
      agent.generateVNext(text, {
        memory: {
          resource: `user_${userId}`,
          thread: { id: `chat_${chatId}` }
        },
        // Create proper RuntimeContext instance for workflows and tools
        runtimeContext: (() => {
          const ctx = new RuntimeContext();
          ctx.set('chatId', chatId);  // Keep both formats for compatibility
          ctx.set('chat_id', chatId);
          ctx.set('user_id', userId);
          ctx.set('username', username);
          return ctx;
        })(),
        maxSteps: 8 // Increased for workflow execution steps
      }),
      // Extended timeout for workflow processing - workflows handle their own user communication
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Agent processing timeout after 45 seconds')), 45000)
      )
    ]) as any;
    
    const processingTime = Date.now() - startTime;
    console.log(`✅ Agent processing completed in ${processingTime}ms`);
    
    return c.json({
      success: true,
      message: response.text,
      metadata: {
        finishReason: response.finishReason,
        usage: response.usage,
        steps: response.steps?.length || 0
      }
    });
    
  } catch (error) {
    console.error('API Error processing message:', error);
    
    if (error instanceof z.ZodError) {
      return c.json({
        success: false,
        error: 'Invalid input format',
        details: error.issues
      }, 400);
    }
    
    return c.json({
      success: false,
      error: 'Internal server error'
    }, 500);
  }
});

// Health check for the API
app.get('/health', (c) => {
  return c.json({ 
    status: 'healthy',
    timestamp: new Date().toISOString(),
    service: 'telegram-api'
  });
});

// Get agent status
app.get('/agent/status', async (c) => {
  try {
    const agent = mastra.getAgent('cimantikosBizAssistant');
    return c.json({
      success: true,
      agent: {
        name: agent.name,
        description: agent.getDescription() || 'N/A',
        available: true
      }
    });
  } catch (error) {
    console.error('Error checking agent status:', error);
    return c.json({
      success: false,
      error: 'Agent not available'
    }, 500);
  }
});

export { app as telegramApi };