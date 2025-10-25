import { getProductsEnriched } from "@Faworra/database/queries";
import { redirect } from "next/navigation";
import { db, getCurrentTeamId } from "@/lib/trpc/server";
import { ProductsView } from "./_components/products-view";

export const metadata = {
  title: "Products | FaworraAdmin",
  description: "Manage your products",
};

export default async function ProductsPage() {
  const teamId = await getCurrentTeamId();
  if (!teamId) redirect("/teams");

  const initial = await getProductsEnriched(db, { teamId, limit: 50 });
  return <ProductsView initialProducts={initial} />;
}
