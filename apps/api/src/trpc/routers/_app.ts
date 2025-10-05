import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { healthRouter } from "./health";
import { communicationsRouter } from "./communications";
import { clientsRouter } from "./clients";
import { ordersRouter } from "./orders";
import { invoicesRouter } from "./invoices";
import { measurementsRouter } from "./measurements";
import { teamsRouter } from "./teams";
import { transactionsRouter } from "./transactions";
import { analyticsRouter } from "./analytics";
import { documentsRouter } from "./documents";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  clients: clientsRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
  invoices: invoicesRouter,
  measurements: measurementsRouter,
  communications: communicationsRouter,
  teams: teamsRouter,
  analytics: analyticsRouter,
  documents: documentsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
