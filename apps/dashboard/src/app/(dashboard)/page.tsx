import { redirect } from "next/navigation";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getOrdersWithClients } from "@Faworra/database/queries";
import { getInvoicesWithOrder } from "@Faworra/database/queries";
import { getMeasurementsWithClient } from "@Faworra/database/queries";
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
      initialOrders={ordersData}
      initialInvoices={invoicesData}
      initialMeasurements={measurementsData}
    />
  );
}
