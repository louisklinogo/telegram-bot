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
import { transactionCategoriesRouter } from "./transaction-categories";
import { analyticsRouter } from "./analytics";
import { documentsRouter } from "./documents";
import { tagsRouter } from "./tags";
import { financialAccountsRouter } from "./financial-accounts";
import { transactionTagsRouter } from "./transaction-tags";
import { productsRouter } from "./products";
import { productCategoriesRouter } from "./product-categories";
import { leadsRouter } from "./leads";

export const appRouter = createTRPCRouter({
  health: healthRouter,
  clients: clientsRouter,
  orders: ordersRouter,
  transactions: transactionsRouter,
  transactionCategories: transactionCategoriesRouter,
  productCategories: productCategoriesRouter,
  invoices: invoicesRouter,
  measurements: measurementsRouter,
  communications: communicationsRouter,
  teams: teamsRouter,
  analytics: analyticsRouter,
  documents: documentsRouter,
  tags: tagsRouter,
  financialAccounts: financialAccountsRouter,
  transactionTags: transactionTagsRouter,
  products: productsRouter,
  leads: leadsRouter,
});

export type AppRouter = typeof appRouter;
export type RouterOutputs = inferRouterOutputs<AppRouter>;
export type RouterInputs = inferRouterInputs<AppRouter>;
