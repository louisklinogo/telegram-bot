import { getMeasurementsWithClient } from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { MeasurementsView } from "./_components/measurements-view";

export default async function MeasurementsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  // ✅ CORRECT: Direct DB query in Server Component
  const measurements = await getMeasurementsWithClient(db, { teamId, limit: 100 });

  return <MeasurementsView initialMeasurements={measurements} />;
}
