import { getThreadsByStatus } from "@Faworra/database/queries";
import { createServerClient } from "@Faworra/supabase/server";
import { redirect } from "next/navigation";
import { InboxGetStarted } from "@/components/inbox/inbox-get-started";
import { InboxView } from "@/components/inbox/inbox-view";
import { db, getCurrentTeamId } from "@/lib/trpc/server";

export default async function InboxPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const supabase = await createServerClient();
  const { data: accounts } = await supabase
    .from("communication_accounts")
    .select("id")
    .eq("team_id", teamId)
    .limit(1);
  const isConnected = Boolean(accounts && accounts.length > 0);

  if (!isConnected) return <InboxGetStarted />;

  // ✅ CORRECT: Direct DB query in Server Component
  const threads = await getThreadsByStatus(db, { teamId, status: "open", limit: 50 });

  return (
    <main className="p-6">
      <div className="h-[calc(100vh-118px)] overflow-hidden">
        <InboxView initialThreads={threads} />
      </div>
    </main>
  );
}
