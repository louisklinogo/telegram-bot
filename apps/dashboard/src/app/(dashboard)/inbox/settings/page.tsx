import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { ConnectedChannelsTable } from "./_components/connected-channels-table";
import { getCurrentTeamId, db } from "@/lib/trpc/server";
import { getTeamAccounts } from "@Faworra/database/queries";

export default async function InboxSettingsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const accounts = await getTeamAccounts(db, teamId);

  return (
    <main className="p-6">
      <div className="mb-8">
        <Link href="/inbox">
          <Button variant="ghost" size="icon" className="mb-4">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="text-2xl font-medium mb-1">Channel Settings</h1>
        <p className="text-sm text-muted-foreground">Manage connected communication channels</p>
      </div>

      <ConnectedChannelsTable initialAccounts={accounts} />
    </main>
  );
}
