import type { inferRouterInputs, inferRouterOutputs } from "@trpc/server";
import { createTRPCRouter } from "../init";
import { analyticsRouter } from "./analytics";
import { clientsRouter } from "./clients";
import { communicationsRouter } from "./communications";
import { documentsRouter } from "./documents";
import { financialAccountsRouter } from "./financial-accounts";
import { healthRouter } from "./health";
import { invoicesRouter } from "./invoices";
import { leadsRouter } from "./leads";
import { measurementsRouter } from "./measurements";
import { ordersRouter } from "./orders";
import { productCategoriesRouter } from "./product-categories";
import { productsRouter } from "./products";
import { tagsRouter } from "./tags";
import { teamsRouter } from "./teams";
import { transactionCategoriesRouter } from "./transaction-categories";
import { transactionTagsRouter } from "./transaction-tags";
import { transactionsRouter } from "./transactions";

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
