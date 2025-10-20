import type { InvoiceWithOrder, OrderWithClient } from "./supabase-queries";

interface ChartDataPoint {
  date: string;
  value: number;
}

/**
 * Generate revenue chart data from orders
 */
export function generateRevenueData(orders: OrderWithClient[]): ChartDataPoint[] {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const revenueByDate = new Map<string, number>();

  // Initialize all dates with 0
  for (const date of last30Days) {
    revenueByDate.set(date, 0);
  }

  // Aggregate revenue by date
  for (const order of orders) {
    const orderDate = new Date(order.created_at).toISOString().split("T")[0];
    if (revenueByDate.has(orderDate)) {
      revenueByDate.set(orderDate, (revenueByDate.get(orderDate) || 0) + order.total_price);
    }
  }

  // Convert to chart format with readable dates
  return Array.from(revenueByDate.entries()).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round(value),
  }));
}

/**
 * Generate orders count chart data
 */
export function generateOrdersData(orders: OrderWithClient[]): ChartDataPoint[] {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const ordersByDate = new Map<string, number>();

  // Initialize all dates with 0
  for (const date of last30Days) {
    ordersByDate.set(date, 0);
  }

  // Count orders by date
  for (const order of orders) {
    const orderDate = new Date(order.created_at).toISOString().split("T")[0];
    if (ordersByDate.has(orderDate)) {
      ordersByDate.set(orderDate, (ordersByDate.get(orderDate) || 0) + 1);
    }
  }

  // Convert to chart format
  return Array.from(ordersByDate.entries()).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value,
  }));
}

/**
 * Generate payments chart data from invoices
 */
export function generatePaymentsData(invoices: InvoiceWithOrder[]): ChartDataPoint[] {
  const last30Days = Array.from({ length: 30 }, (_, i) => {
    const date = new Date();
    date.setDate(date.getDate() - (29 - i));
    return date.toISOString().split("T")[0];
  });

  const paymentsByDate = new Map<string, number>();

  // Initialize all dates with 0
  for (const date of last30Days) {
    paymentsByDate.set(date, 0);
  }

  // Aggregate paid invoices by date
  for (const invoice of invoices) {
    if (invoice.status === "paid") {
      const invoiceDate = new Date(invoice.created_at).toISOString().split("T")[0];
      if (paymentsByDate.has(invoiceDate)) {
        paymentsByDate.set(invoiceDate, (paymentsByDate.get(invoiceDate) || 0) + invoice.amount);
      }
    }
  }

  // Convert to chart format
  return Array.from(paymentsByDate.entries()).map(([date, value]) => ({
    date: new Date(date).toLocaleDateString("en-US", { month: "short", day: "numeric" }),
    value: Math.round(value),
  }));
}

/**
 * Calculate dashboard statistics
 */
export function calculateDashboardStats(orders: OrderWithClient[], invoices: InvoiceWithOrder[]) {
  const totalRevenue = orders.reduce((sum, order) => sum + order.total_price, 0);

  const pendingPayments = invoices
    .filter((inv) => inv.status !== "paid")
    .reduce((sum, inv) => sum + inv.amount, 0);

  const activeOrders = orders.filter((order) => String(order.status).toLowerCase() !== "completed").length;

  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

  const recentMeasurementsCount = 0; // This will be passed from the measurement query

  return {
    totalRevenue,
    pendingPayments,
    activeOrders,
    recentMeasurements: recentMeasurementsCount,
  };
}
