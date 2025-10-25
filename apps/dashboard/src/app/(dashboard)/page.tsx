import {
  getInvoicesWithOrder,
  getMeasurementsWithClient,
  getOrdersWithClients,
} from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { DashboardView } from "./_components/dashboard-view";

// PPR disabled for now - requires Next.js canary
// Will enable when stable in Next.js 16+
// export const experimental_ppr = true;

export default async function DashboardPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB queries in Server Component (no prefetch waste)
  const [ordersData, invoicesData, measurementsData] = await Promise.all([
    getOrdersWithClients(db, { teamId, limit: 50 }),
    getInvoicesWithOrder(db, { teamId, limit: 50 }),
    getMeasurementsWithClient(db, { teamId, limit: 50 }),
  ]);

  return (
    <DashboardView
      initialInvoices={invoicesData}
      initialMeasurements={measurementsData}
      initialOrders={ordersData}
    />
  );
}
