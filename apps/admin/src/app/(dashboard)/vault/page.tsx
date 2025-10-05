import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { getDocuments } from "@cimantikos/database/queries";
import { VaultView } from "./_components/vault-view";
import { VaultUploadZone } from "./_components/vault-upload-zone";

export const metadata = {
  title: "Vault | Cimantikós",
};

export default async function VaultPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // Fetch initial data server-side
  const initialData = await getDocuments(db, {
    teamId,
    limit: 20,
  });

  return (
    <VaultUploadZone teamId={teamId}>
      <div className="px-6">
        <VaultView initialData={initialData.items} teamId={teamId} />
      </div>
    </VaultUploadZone>
  );
}
