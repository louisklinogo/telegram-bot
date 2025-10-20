import { redirect } from "next/navigation";
import { getAuthenticatedUser, getCurrentTeamId, db } from "@/lib/trpc/server";
import { getUserTeams } from "@Faworra/database/queries";
import { Header } from "@/components/header";
import { Sidebar } from "@/components/sidebar/sidebar";

export default async function DashboardLayout({ children }: { children: React.ReactNode }) {
  // ✅ OPTIMIZED: Uses React.cache() - deduplicated with page-level calls
  const user = await getAuthenticatedUser();

  if (!user) {
    redirect("/login");
  }

  // ✅ OPTIMIZED: Uses React.cache() - shared with all pages calling getCurrentTeamId()
  const teamId = await getCurrentTeamId();

  if (!teamId) {
    redirect("/teams/create");
  }

  // ✅ OPTIMIZED: Fetch teams once in layout, pass to Sidebar
  const userTeams = await getUserTeams(db, user.id);

  return (
    <div className="flex min-h-screen w-full">
      <Sidebar teams={userTeams} currentTeamId={teamId} />
      <div className="flex min-h-screen flex-1 flex-col md:ml-[70px]">
        <Header />
        <div className="px-8 pb-4">{children}</div>
      </div>
    </div>
  );
}
