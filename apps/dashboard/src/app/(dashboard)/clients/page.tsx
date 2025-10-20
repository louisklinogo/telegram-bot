import { redirect } from "next/navigation";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getEnrichedClients } from "@Faworra/database/queries";
import { ClientsView } from "./_components/clients-view";

export const metadata = {
  title: "Clients | FaworraAdmin",
  description: "Manage your clients",
};

export default async function ClientsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB query in Server Component with enriched data
  const clients = await getEnrichedClients(db, { teamId, limit: 50 });

  return <ClientsView initialClients={clients} />;
}
