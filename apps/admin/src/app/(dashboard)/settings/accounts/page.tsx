import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { financialAccounts } from "@cimantikos/database/schema";
import { eq } from "drizzle-orm";
import { AccountsView } from "./_components/accounts-view";

export default async function AccountsSettingsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) return null;

  const rows = await db
    .select({ id: financialAccounts.id, name: financialAccounts.name, currency: financialAccounts.currency, type: financialAccounts.type, status: financialAccounts.status })
    .from(financialAccounts)
    .where(eq(financialAccounts.teamId, teamId));

  return (
    <div className="px-6 py-6">
      <AccountsView initialAccounts={rows} />
    </div>
  );
}
