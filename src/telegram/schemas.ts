import { z } from 'zod';

/**
 * Comprehensive Telegram message validation schemas
 * Implements security-focused validation to prevent injection attacks
 * and ensure data integrity for all message types
 */

// Base sanitization helpers
const sanitizeString = (str: string): string => {
  return str
    .trim()
    .replace(/[\x00-\x1F\x7F]/g, '') // Remove control characters
    .slice(0, 4096); // Prevent extremely long strings
};

const sanitizeHtml = (str: string): string => {
  return sanitizeString(str)
    .replace(/[<>]/g, '') // Remove potential HTML tags
    .replace(/javascript:/gi, '') // Remove javascript: protocol
    .replace(/data:/gi, ''); // Remove data: protocol
};

// Custom string validation with security measures
const secureString = (maxLength: number = 1000) =>
  z.string()
    .min(1, "String cannot be empty")
    .max(maxLength, `String cannot exceed ${maxLength} characters`)
    .transform(sanitizeString)
    .refine((str) => str.length > 0, "String cannot be empty after sanitization");

const secureOptionalString = (maxLength: number = 1000) =>
  z.string()
    .max(maxLength, `String cannot exceed ${maxLength} characters`)
    .transform(sanitizeString)
    .optional();

const secureHtmlString = (maxLength: number = 1000) =>
  z.string()
    .min(1, "String cannot be empty")
    .max(maxLength, `String cannot exceed ${maxLength} characters`)
    .transform(sanitizeHtml)
    .refine((str) => str.length > 0, "String cannot be empty after sanitization");

// Telegram User Schema
export const telegramUserSchema = z.object({
  id: z.number().int().positive("User ID must be positive"),
  is_bot: z.boolean(),
  first_name: secureString(64),
  last_name: secureOptionalString(64),
  username: secureOptionalString(32),
  language_code: z.string().max(10).optional(),
  is_premium: z.boolean().optional(),
  added_to_attachment_menu: z.boolean().optional(),
});

// Telegram Chat Schema
export const telegramChatSchema = z.object({
  id: z.number().int("Chat ID must be an integer"),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
  title: secureOptionalString(255),
  username: secureOptionalString(32),
  first_name: secureOptionalString(64),
  last_name: secureOptionalString(64),
  all_members_are_administrators: z.boolean().optional(),
  description: secureOptionalString(255),
});

// Message Entity Schema (for text formatting, mentions, etc.)
export const messageEntitySchema = z.object({
  type: z.enum([
    'mention', 'hashtag', 'cashtag', 'bot_command', 'url', 'email',
    'phone_number', 'bold', 'italic', 'underline', 'strikethrough',
    'spoiler', 'code', 'pre', 'text_link', 'text_mention', 'custom_emoji'
  ]),
  offset: z.number().int().min(0),
  length: z.number().int().positive(),
  url: z.string().url().optional(),
  user: telegramUserSchema.optional(),
  language: z.string().max(10).optional(),
  custom_emoji_id: z.string().optional(),
});

// Base Message Schema
const baseMessageSchema = z.object({
  message_id: z.number().int().positive(),
  from: telegramUserSchema.optional(),
  sender_chat: telegramChatSchema.optional(),
  date: z.number().int().positive(),
  chat: telegramChatSchema,
  forward_from: telegramUserSchema.optional(),
  forward_from_chat: telegramChatSchema.optional(),
  forward_from_message_id: z.number().int().positive().optional(),
  forward_signature: secureOptionalString(128),
  forward_sender_name: secureOptionalString(64),
  forward_date: z.number().int().positive().optional(),
  is_automatic_forward: z.boolean().optional(),
  reply_to_message: z.lazy(() => telegramMessageSchema).optional(),
  via_bot: telegramUserSchema.optional(),
  edit_date: z.number().int().positive().optional(),
  has_protected_content: z.boolean().optional(),
  media_group_id: z.string().max(64).optional(),
  author_signature: secureOptionalString(128),
});

// Text Message Schema (most common for our bot)
export const textMessageSchema = baseMessageSchema.extend({
  text: secureHtmlString(4096),
  entities: z.array(messageEntitySchema).optional(),
});

// Command Message Schema (for bot commands like /start, /help)
export const commandMessageSchema = textMessageSchema.extend({
  text: z.string()
    .min(1)
    .max(4096)
    .regex(/^\/[a-zA-Z0-9_]+/, "Must start with a valid bot command")
    .transform(sanitizeString),
});

// Business Message Schemas for our specific use cases

// Invoice Message Schema - for messages containing order information
export const invoiceMessageSchema = z.object({
  customer_name: secureString(100),
  phone_number: z.string()
    .regex(/^\+?[\d\s\-\(\)]{8,20}$/, "Invalid phone number format")
    .transform(sanitizeString)
    .optional(),
  items: z.array(z.object({
    name: secureString(200),
    price: z.string()
      .regex(/^\d+(\.\d{1,2})?/, "Price must be a valid number")
      .transform(val => parseFloat(val))
      .refine(val => val > 0, "Price must be greater than 0"),
    currency: z.string().length(3).default('GHS'), // Ghana Cedis
  })).min(1, "At least one item is required"),
  notes: secureOptionalString(500),
  raw_message: secureString(4096),
});

// Measurement Message Schema - for body measurement messages
export const measurementMessageSchema = z.object({
  customer_name: secureString(100),
  measurements: z.record(
    z.string().max(10), // Measurement abbreviation (CH, ST, etc.)
    z.string()
      .regex(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/, "Invalid measurement format")
      .max(20)
  ).refine(
    (measurements) => Object.keys(measurements).length > 0,
    "At least one measurement is required"
  ),
  notes: secureOptionalString(500),
  raw_message: secureString(4096),
});

// File/Document Message Schema
export const fileMessageSchema = baseMessageSchema.extend({
  document: z.object({
    file_id: z.string().min(1).max(250),
    file_unique_id: z.string().min(1).max(32),
    file_name: secureOptionalString(255),
    mime_type: z.string()
      .max(100)
      .regex(/^[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*\/[a-zA-Z0-9][a-zA-Z0-9!#$&\-\^_.]*$/, "Invalid MIME type")
      .optional(),
    file_size: z.number().int().min(0).max(20 * 1024 * 1024).optional(), // Max 20MB
  }),
  caption: secureOptionalString(1024),
  caption_entities: z.array(messageEntitySchema).optional(),
});

// Photo Message Schema
export const photoMessageSchema = baseMessageSchema.extend({
  photo: z.array(z.object({
    file_id: z.string().min(1).max(250),
    file_unique_id: z.string().min(1).max(32),
    width: z.number().int().positive(),
    height: z.number().int().positive(),
    file_size: z.number().int().min(0).optional(),
  })).min(1),
  caption: secureOptionalString(1024),
  caption_entities: z.array(messageEntitySchema).optional(),
});

// Complete Message Schema (union of all message types)
export const telegramMessageSchema: z.ZodType<any> = z.discriminatedUnion('type', [
  textMessageSchema.extend({ type: z.literal('text') }),
  commandMessageSchema.extend({ type: z.literal('command') }),
  fileMessageSchema.extend({ type: z.literal('document') }),
  photoMessageSchema.extend({ type: z.literal('photo') }),
]).or(baseMessageSchema); // Fallback to base schema for other types

// Webhook Update Schema (what Telegram sends to our webhook)
export const telegramUpdateSchema = z.object({
  update_id: z.number().int().positive(),
  message: telegramMessageSchema.optional(),
  edited_message: telegramMessageSchema.optional(),
  channel_post: telegramMessageSchema.optional(),
  edited_channel_post: telegramMessageSchema.optional(),
  inline_query: z.object({
    id: z.string().min(1).max(255),
    from: telegramUserSchema,
    query: secureString(512),
    offset: secureString(64),
    chat_type: z.enum(['sender', 'private', 'group', 'supergroup', 'channel']).optional(),
    location: z.object({
      longitude: z.number(),
      latitude: z.number(),
      live_period: z.number().int().positive().optional(),
      heading: z.number().int().min(1).max(360).optional(),
      horizontal_accuracy: z.number().positive().optional(),
    }).optional(),
  }).optional(),
  chosen_inline_result: z.object({
    result_id: z.string().min(1).max(64),
    from: telegramUserSchema,
    location: z.object({
      longitude: z.number(),
      latitude: z.number(),
    }).optional(),
    inline_message_id: z.string().optional(),
    query: secureString(512),
  }).optional(),
  callback_query: z.object({
    id: z.string().min(1).max(32),
    from: telegramUserSchema,
    message: telegramMessageSchema.optional(),
    inline_message_id: z.string().optional(),
    chat_instance: z.string().min(1).max(32),
    data: secureOptionalString(64),
    game_short_name: secureOptionalString(64),
  }).optional(),
}).refine(
  (update) => {
    // At least one of the optional fields must be present
    return !!(update.message || update.edited_message || update.channel_post ||
             update.edited_channel_post || update.inline_query ||
             update.chosen_inline_result || update.callback_query);
  },
  "Update must contain at least one valid field"
);

// API Request/Response Schemas for our endpoints

// Process Message Request Schema
export const processMessageRequestSchema = z.object({
  message: secureString(4096),
  user_id: z.number().int().positive(),
  chat_id: z.number().int(),
  message_id: z.number().int().positive(),
  user_name: secureOptionalString(64),
  chat_type: z.enum(['private', 'group', 'supergroup', 'channel']).default('private'),
  timestamp: z.number().int().positive().default(() => Math.floor(Date.now() / 1000)),
});

// Process Message Response Schema  
export const processMessageResponseSchema = z.object({
  success: z.boolean(),
  response: secureString(4096),
  message_type: z.enum(['invoice', 'measurement', 'general', 'error']).optional(),
  processed_data: z.object({
    invoice_data: invoiceMessageSchema.optional(),
    measurement_data: measurementMessageSchema.optional(),
  }).optional(),
  error: z.string().optional(),
});

// Rate Limiting Schema
export const rateLimitInfoSchema = z.object({
  limit: z.number().int().positive(),
  remaining: z.number().int().min(0),
  reset: z.number().int().positive(),
  retry_after: z.number().int().min(0).optional(),
});

// Security Event Schema for logging
export const securityEventSchema = z.object({
  event_type: z.enum(['rate_limit_exceeded', 'invalid_signature', 'malformed_request', 'suspicious_content']),
  severity: z.enum(['low', 'medium', 'high', 'critical']),
  user_id: z.number().int().positive().optional(),
  chat_id: z.number().int().optional(),
  ip_address: z.string().ip().optional(),
  user_agent: secureOptionalString(500),
  request_body: secureOptionalString(2048),
  timestamp: z.number().int().positive().default(() => Math.floor(Date.now() / 1000)),
  additional_info: z.record(z.string()).optional(),
});

// Helper function to detect message type based on content
export function detectMessageType(text: string): 'invoice' | 'measurement' | 'command' | 'general' {
  const sanitizedText = sanitizeString(text);
  
  // Command detection
  if (sanitizedText.startsWith('/')) {
    return 'command';
  }
  
  // Measurement detection (contains measurement abbreviations)
  const measurementPattern = /\b(CH|ST|SL|SH|WT|HP|LP|CF|NK|RD|LT)\s+\d+(\.\d+)?(\/\d+(\.\d+)?)?\b/i;
  if (measurementPattern.test(sanitizedText)) {
    return 'measurement';
  }
  
  // Invoice detection (contains price indicators)
  const invoicePattern = /(\d+\s*(cedis?|ghana|GHS|₵))|(\$\d+)|(\d+\.\d{2})/i;
  if (invoicePattern.test(sanitizedText)) {
    return 'invoice';
  }
  
  return 'general';
}

// Helper function to validate and parse business messages
export function parseBusinessMessage(text: string, type: 'invoice' | 'measurement'): any {
  const sanitizedText = sanitizeString(text);
  
  if (type === 'measurement') {
    // Use our existing measurement parsing logic
    const words = sanitizedText.split(/\s+/);
    const measurements: Record<string, string> = {};
    let customerName = '';
    
    // Extract measurements and customer name
    for (let i = 0; i < words.length - 1; i++) {
      const abbrev = words[i].toUpperCase();
      const value = words[i + 1];
      
      if (abbrev.match(/^[A-Z]{1,4}$/) && value.match(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/)) {
        measurements[abbrev] = value;
        i++; // Skip value in next iteration
      }
    }
    
    // Customer name is typically the last non-measurement word
    const lastWord = words[words.length - 1];
    if (lastWord && !lastWord.match(/^\d+(\.\d+)?(\/\d+(\.\d+)?)?$/)) {
      customerName = lastWord;
    }
    
    return measurementMessageSchema.parse({
      customer_name: customerName,
      measurements,
      raw_message: sanitizedText,
    });
  }
  
  if (type === 'invoice') {
    // Basic invoice parsing - this would need more sophisticated logic
    const lines = sanitizedText.split('\n').map(line => line.trim());
    const items: any[] = [];
    let customerName = '';
    let phoneNumber = '';
    
    // Extract phone number
    const phoneMatch = sanitizedText.match(/\+?[\d\s\-\(\)]{8,20}/);
    if (phoneMatch) {
      phoneNumber = phoneMatch[0];
    }
    
    // Extract customer name and items (simplified parsing)
    lines.forEach(line => {
      const priceMatch = line.match(/(\d+)\s*(cedis?|ghana|GHS|₵)/i);
      if (priceMatch) {
        const itemName = line.replace(priceMatch[0], '').trim();
        if (itemName) {
          items.push({
            name: itemName,
            price: parseInt(priceMatch[1]),
            currency: 'GHS'
          });
        }
      } else if (line.length > 2 && !line.match(/\d/) && !customerName) {
        customerName = line;
      }
    });
    
    return invoiceMessageSchema.parse({
      customer_name: customerName,
      phone_number: phoneNumber || undefined,
      items,
      raw_message: sanitizedText,
    });
  }
  
  throw new Error(`Unsupported business message type: ${type}`);
}

// Export types for TypeScript
export type TelegramUser = z.infer<typeof telegramUserSchema>;
export type TelegramChat = z.infer<typeof telegramChatSchema>;
export type TelegramMessage = z.infer<typeof telegramMessageSchema>;
export type TelegramUpdate = z.infer<typeof telegramUpdateSchema>;
export type ProcessMessageRequest = z.infer<typeof processMessageRequestSchema>;
export type ProcessMessageResponse = z.infer<typeof processMessageResponseSchema>;
export type InvoiceMessage = z.infer<typeof invoiceMessageSchema>;
export type MeasurementMessage = z.infer<typeof measurementMessageSchema>;
export type SecurityEvent = z.infer<typeof securityEventSchema>;
export type RateLimitInfo = z.infer<typeof rateLimitInfoSchema>;