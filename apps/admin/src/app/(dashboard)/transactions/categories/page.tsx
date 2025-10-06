import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { getTransactionCategories } from "@cimantikos/database/queries";
import { CategoriesTable } from "./_components/categories-table";
import { CreateCategoryLauncher } from "./_components/create-category-launcher";

export default async function TransactionCategoriesPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) return null;

  const categories = await getTransactionCategories(db, { teamId });

  return (
    <div className="px-6 py-6 space-y-3">
      <div className="flex items-center justify-end">
        <CreateCategoryLauncher categories={categories as any} />
      </div>
      <CategoriesTable initialCategories={categories as any} />
    </div>
  );
}
