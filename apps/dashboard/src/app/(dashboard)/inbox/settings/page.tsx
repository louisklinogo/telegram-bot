import { getTeamAccounts } from "@Faworra/database/queries";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { Button } from "@/components/ui/button";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { ConnectedChannelsTable } from "./_components/connected-channels-table";

export default async function InboxSettingsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const accounts = await getTeamAccounts(db, teamId);

  return (
    <main className="p-6">
      <div className="mb-8">
        <Link href="/inbox">
          <Button className="mb-4" size="icon" variant="ghost">
            <ArrowLeft className="h-4 w-4" />
          </Button>
        </Link>
        <h1 className="mb-1 font-medium text-2xl">Channel Settings</h1>
        <p className="text-muted-foreground text-sm">Manage connected communication channels</p>
      </div>

      <ConnectedChannelsTable initialAccounts={accounts} />
    </main>
  );
}
