"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";
import { CategoryCreateSheet } from "./category-create-sheet";

type CategoryNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  children?: CategoryNode[];
};

export function CreateCategoryLauncher({ categories = [], defaultTaxType = "" }: { categories?: CategoryNode[]; defaultTaxType?: string }) {
  const [open, setOpen] = useState(false);
  const router = useRouter();
  return (
    <>
      <Button size="sm" onClick={() => setOpen(true)}>
        Add category
      </Button>
      <CategoryCreateSheet
        open={open}
        onOpenChange={(v) => {
          setOpen(v);
          if (!v) router.refresh();
        }}
        categories={categories}
        defaultTaxType={defaultTaxType}
      />
    </>
  );
}
