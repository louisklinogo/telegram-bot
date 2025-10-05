import { z } from "zod";

export const StartBaileysSessionSchema = z.object({
  externalId: z.string().min(3),
  displayName: z.string().min(1),
});
export type StartBaileysSessionInput = z.infer<typeof StartBaileysSessionSchema>;
