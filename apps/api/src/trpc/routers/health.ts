import { publicProcedure, createTRPCRouter } from "../init";
import { z } from "zod";

export const healthRouter = createTRPCRouter({
  ping: publicProcedure.input(z.void().optional()).query(() => ({ ok: true })),
});
