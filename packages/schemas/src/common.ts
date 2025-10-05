import { z } from "zod";

export const ApiErrorSchema = z.object({ error: z.string() });
export type ApiError = z.infer<typeof ApiErrorSchema>;

export const IdParamSchema = z.object({ id: z.string().min(1) });

export const PaginationSchema = z.object({
  limit: z.number().int().min(1).max(100).default(50),
  cursor: z.string().nullish(),
});
