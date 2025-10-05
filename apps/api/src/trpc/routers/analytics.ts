import { createTRPCRouter, teamProcedure } from "../init";
import {
  getMostActiveClient,
  getInactiveClientsCount,
  getTopRevenueClient,
  getNewClientsThisMonth,
} from "@cimantikos/database/queries";

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
});
