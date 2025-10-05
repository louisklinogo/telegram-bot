import { z } from "zod";

export const SendMessageSchema = z.object({
  externalId: z.string().min(1),
  to: z.string().min(3),
  text: z.string().min(1),
  clientMessageId: z.string().min(1).optional(),
});
export type SendMessageInput = z.infer<typeof SendMessageSchema>;

export const SendThreadTextSchema = z.object({
  text: z.string().min(1),
  clientMessageId: z.string().min(1).optional(),
});
export type SendThreadTextInput = z.infer<typeof SendThreadTextSchema>;

export const SendThreadMediaSchema = z.object({
  mediaPath: z.string().min(1),
  mediaType: z.string().min(1),
  caption: z.string().optional(),
  filename: z.string().optional(),
  clientMessageId: z.string().min(1).optional(),
});
export type SendThreadMediaInput = z.infer<typeof SendThreadMediaSchema>;
