import { z } from 'zod';

export const TelegramMessageSchema = z.object({
  message_id: z.number(),
  from: z.object({
    id: z.number(),
    first_name: z.string(),
    last_name: z.string().optional(),
    username: z.string().optional(),
  }),
  chat: z.object({
    id: z.number(),
    type: z.enum(['private', 'group', 'supergroup', 'channel']),
    title: z.string().optional(),
    username: z.string().optional(),
  }),
  text: z.string().optional(),
  date: z.number(),
});

export const TelegramUserSchema = z.object({
  id: z.number(),
  first_name: z.string(),
  last_name: z.string().optional(),
  username: z.string().optional(),
  language_code: z.string().optional(),
});

export const TelegramChatSchema = z.object({
  id: z.number(),
  type: z.enum(['private', 'group', 'supergroup', 'channel']),
  title: z.string().optional(),
  username: z.string().optional(),
  first_name: z.string().optional(),
  last_name: z.string().optional(),
});

export const BotCommandSchema = z.object({
  command: z.string(),
  description: z.string(),
});

export type TelegramMessage = z.infer<typeof TelegramMessageSchema>;
export type TelegramUser = z.infer<typeof TelegramUserSchema>;
export type TelegramChat = z.infer<typeof TelegramChatSchema>;
export type BotCommand = z.infer<typeof BotCommandSchema>;

// Intent types
export type MessageIntent = 'invoice' | 'measurement' | 'help' | 'unknown' | 'start';

// Session data for user context
export interface UserSession {
  user_id: number;
  current_intent: MessageIntent | null;
  data: any; // Could be invoice data or measurement data
  step: number; // For multi-step conversations
  created_at: Date;
  updated_at: Date;
}