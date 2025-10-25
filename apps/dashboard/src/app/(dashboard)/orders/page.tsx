import { getOrdersWithClients } from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { OrdersView } from "./_components/orders-view";

export default async function OrdersPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB query in Server Component
  const orders = await getOrdersWithClients(db, { teamId, limit: 50 });

  return <OrdersView initialOrders={orders} />;
}
