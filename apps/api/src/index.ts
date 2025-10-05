import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { trpcServer } from "@hono/trpc-server";
import type { MiddlewareHandler } from "hono";
import { appRouter } from "./trpc/routers/_app";
import { createTRPCContext } from "./trpc/init";
import type { ApiEnv } from "./types/hono-env";
import { registerWebhookRoutes } from "./rest/webhooks";
import { registerCommunicationsRoutes } from "./rest/communications";
import { registerProviderRoutes } from "./rest/providers";
import { registerInvoicesRoutes } from "./rest/invoices";
import { requireAuthTeam } from "./rest/middleware/auth";

const app = new Hono<ApiEnv>();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Authorization", "Content-Type"],
  }),
);

app.get("/health", (c) => c.json({ status: "ok" }));

app.use(
  "/trpc/*",
  trpcServer({ router: appRouter, createContext: createTRPCContext }) as unknown as MiddlewareHandler<ApiEnv>,
);

registerWebhookRoutes(app);
app.use("/communications/*", requireAuthTeam);
app.use("/providers/*", requireAuthTeam);
app.use("/invoices/*", requireAuthTeam);
registerCommunicationsRoutes(app);
registerProviderRoutes(app);
registerInvoicesRoutes(app);

export default {
  port: process.env.API_PORT ? Number(process.env.API_PORT) : 3001,
  fetch: app.fetch,
};
