"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { CategoryCreateSheet } from "./category-create-sheet";

type CategoryNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  children?: CategoryNode[];
};

export function CreateCategoryLauncher({
  categories = [],
  defaultTaxType = "",
}: {
  categories?: CategoryNode[];
  defaultTaxType?: string;
}) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button onClick={() => setOpen(true)} size="sm">
        Add category
      </Button>
      <CategoryCreateSheet
        categories={categories}
        defaultTaxType={defaultTaxType}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) router.refresh();
        }}
        open={open}
      />
    </>
  );
}
