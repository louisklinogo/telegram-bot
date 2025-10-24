import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { getTransactionCategories, getTeamById } from "@Faworra/database/queries";
import { CategoriesTable } from "./_components/categories-table";

export default async function TransactionCategoriesPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) return null;

  const categories = await getTransactionCategories(db, { teamId });
  const team = await getTeamById(db, teamId);
  const defaultTaxType = mapCountryToTaxType(team?.country);

  return (
    <div className="px-6 py-6 space-y-3">
      <CategoriesTable initialCategories={categories as any} defaultTaxType={defaultTaxType} />
    </div>
  );
}

function mapCountryToTaxType(country?: string | null) {
  const c = (country || "").toUpperCase();
  if (c === "GH") return "vat";
  if (["CA", "AU", "NZ", "IN", "SG"].includes(c)) return "gst";
  return "";
}
