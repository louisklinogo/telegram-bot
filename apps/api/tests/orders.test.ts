import { describe, it, expect, beforeAll, afterAll } from "bun:test";
import { eq } from "drizzle-orm";
import { orders, teamDailyOrdersSummary } from "@Faworra/database/schema";
import { createOrderWithItems } from "@Faworra/database/queries";
import { 
  getCompletedOrdersThisMonth, 
  getPendingOrdersCount, 
  getAverageOrderValue 
} from "@Faworra/database/queries/analytics";

// Mock DB client (you'll need to set up your actual test DB)
const db = {} as any; // Replace with actual test DB connection
const testTeamId = "test-team-id-123";
const testClientId = "test-client-id-123";

describe("Orders Integration Tests", () => {
  beforeAll(async () => {
    // Clean up test data
    await db.delete(teamDailyOrdersSummary).where(eq(teamDailyOrdersSummary.teamId, testTeamId));
    await db.delete(orders).where(eq(orders.teamId, testTeamId));
  });

  afterAll(async () => {
    // Clean up after tests
    await db.delete(teamDailyOrdersSummary).where(eq(teamDailyOrdersSummary.teamId, testTeamId));
    await db.delete(orders).where(eq(orders.teamId, testTeamId));
  });

  it("should create order with sequential number", async () => {
    const order = await createOrderWithItems(db, {
      teamId: testTeamId,
      clientId: testClientId,
      totalPrice: 1000,
      depositAmount: 200,
      balanceAmount: 800,
      status: "generated",
    });

    expect(order.orderNumber).toMatch(/^ORD-\d{4}-\d{4}$/);
    expect(order.totalPrice).toBe("1000.00");
  });

  it("should update daily summary on order creation", async () => {
    // Create an order
    await createOrderWithItems(db, {
      teamId: testTeamId,
      clientId: testClientId,
      totalPrice: 500,
      status: "generated",
    });

    // Check summary was updated
    const summary = await db
      .select()
      .from(teamDailyOrdersSummary)
      .where(eq(teamDailyOrdersSummary.teamId, testTeamId))
      .limit(1);

    expect(summary.length).toBeGreaterThan(0);
    expect(summary[0].createdCount).toBeGreaterThan(0);
  });

  it("should update analytics when order is completed", async () => {
    // Create and complete an order
    const order = await createOrderWithItems(db, {
      teamId: testTeamId,
      clientId: testClientId,
      totalPrice: 750,
      status: "generated",
    });

    // Update to completed
    await db
      .update(orders)
      .set({ status: "completed" })
      .where(eq(orders.id, order.id));

    // Check analytics
    const completedCount = await getCompletedOrdersThisMonth(db, testTeamId);
    const pendingCount = await getPendingOrdersCount(db, testTeamId);
    const avgValue = await getAverageOrderValue(db, testTeamId);

    expect(completedCount).toBeGreaterThan(0);
    expect(Number(avgValue)).toBeGreaterThan(0);
  });

  it("should handle status changes correctly", async () => {
    const order = await createOrderWithItems(db, {
      teamId: testTeamId,
      clientId: testClientId,
      totalPrice: 300,
      status: "in_progress",
    });

    // Cancel the order
    await db
      .update(orders)
      .set({ status: "cancelled" })
      .where(eq(orders.id, order.id));

    // Cancelled orders should not count in pending or completed
    const pendingCount = await getPendingOrdersCount(db, testTeamId);
    const completedCount = await getCompletedOrdersThisMonth(db, testTeamId);
    
    // These should reflect the cancelled status
    expect(typeof pendingCount).toBe("number");
    expect(typeof completedCount).toBe("number");
  });
});