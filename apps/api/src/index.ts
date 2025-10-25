import "dotenv/config";
import { trpcServer } from "@hono/trpc-server";
import type { MiddlewareHandler } from "hono";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { registerCommunicationsRoutes } from "./rest/communications";
import { registerInvoicesRoutes } from "./rest/invoices";
import { requireAuthTeam } from "./rest/middleware/auth";
import { registerProductsRoutes } from "./rest/products";
import { registerProviderRoutes } from "./rest/providers";
import { registerTransactionsRoutes } from "./rest/transactions";
import { registerWebhookRoutes } from "./rest/webhooks";
import { createTRPCContext } from "./trpc/init";
import { appRouter } from "./trpc/routers/_app";
import type { ApiEnv } from "./types/hono-env";
import baseLogger from "./lib/logger";

const app = new Hono<ApiEnv>();

app.use(
  "*",
  cors({
    origin: (origin) => origin ?? "*",
    allowMethods: ["GET", "POST", "PUT", "DELETE", "OPTIONS", "PATCH"],
    allowHeaders: ["Authorization", "Content-Type"],
  })
);

app.get("/health", (c) => c.json({ status: "ok" }));

// Request logger middleware
app.use("*", async (c, next) => {
  const reqId = crypto.randomUUID();
  const ip =
    c.req.header("x-forwarded-for")?.split(",")[0]?.trim() ||
    c.req.header("x-real-ip") ||
    c.req.header("cf-connecting-ip") ||
    "unknown";
  const logger = baseLogger.child({ reqId, ip });
  c.set("logger", logger);
  const start = Date.now();
  logger.info({ method: c.req.method, path: c.req.path }, "request:start");
  try {
    await next();
  } finally {
    const durationMs = Date.now() - start;
    logger.info({ status: c.res.status, durationMs }, "request:end");
  }
});

app.use(
  "/trpc/*",
  trpcServer({
    router: appRouter,
    createContext: createTRPCContext,
  }) as unknown as MiddlewareHandler<ApiEnv>
);

registerWebhookRoutes(app);
app.use("/communications/*", requireAuthTeam);
app.use("/providers/*", requireAuthTeam);
app.use("/invoices/*", requireAuthTeam);
app.use("/transactions/*", requireAuthTeam);
app.use("/products/*", requireAuthTeam);
registerCommunicationsRoutes(app);
registerProviderRoutes(app);
registerInvoicesRoutes(app);
registerTransactionsRoutes(app);
registerProductsRoutes(app);

const DEFAULT_API_PORT = 3001;

export default {
  port: process.env.API_PORT ? Number(process.env.API_PORT) : DEFAULT_API_PORT,
  fetch: app.fetch,
};
