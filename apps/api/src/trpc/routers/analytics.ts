import { createTRPCRouter, teamProcedure } from "../init";
import {
  getMostActiveClient,
  getInactiveClientsCount,
  getTopRevenueClient,
  getNewClientsThisMonth,
  getHighestValueOrder,
  getCompletedOrdersThisMonth,
  getPendingOrdersCount,
  getAverageOrderValue,
} from "@Faworra/database/queries";

export const analyticsRouter = createTRPCRouter({
  // Get most active client
  mostActiveClient: teamProcedure.query(async ({ ctx }) => {
    return getMostActiveClient(ctx.db, ctx.teamId);
  }),

  // Get count of inactive clients
  inactiveClientsCount: teamProcedure.query(async ({ ctx }) => {
    return getInactiveClientsCount(ctx.db, ctx.teamId);
  }),

  // Get top revenue client
  topRevenueClient: teamProcedure.query(async ({ ctx }) => {
    return getTopRevenueClient(ctx.db, ctx.teamId);
  }),

  // Get new clients this month count
  newClientsThisMonth: teamProcedure.query(async ({ ctx }) => {
    return getNewClientsThisMonth(ctx.db, ctx.teamId);
  }),

  // Get highest value order
  highestValueOrder: teamProcedure.query(async ({ ctx }) => {
    return getHighestValueOrder(ctx.db, ctx.teamId);
  }),

  // Get completed orders in last 30 days
  completedOrdersThisMonth: teamProcedure.query(async ({ ctx }) => {
    return getCompletedOrdersThisMonth(ctx.db, ctx.teamId);
  }),

  // Get count of pending orders
  pendingOrdersCount: teamProcedure.query(async ({ ctx }) => {
    return getPendingOrdersCount(ctx.db, ctx.teamId);
  }),

  // Get average order value
  averageOrderValue: teamProcedure.query(async ({ ctx }) => {
    return getAverageOrderValue(ctx.db, ctx.teamId);
  }),
});
