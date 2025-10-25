import { z } from "zod";
import { createTRPCRouter, publicProcedure } from "../init";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.input(z.void().optional()).query(() => ({ ok: true })),
});
