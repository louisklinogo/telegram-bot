import { redirect } from "next/navigation";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getInvoicesWithOrder } from "@Faworra/database/queries";
import { InvoicesView } from "./_components/invoices-view";

export default async function InvoicesPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB query in Server Component
  const invoices = await getInvoicesWithOrder(db, { teamId, limit: 50 });

  return <InvoicesView initialInvoices={invoices} />;
}
