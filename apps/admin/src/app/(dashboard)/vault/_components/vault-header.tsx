"use client";

import { Search, Upload, Grid3x3, List } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import { useVaultParams } from "@/hooks/use-vault-params";
import { useVaultStore } from "@/stores/vault-store";
import { useTransition } from "react";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@/components/ui/toggle-group";
import { VaultSearchFilter } from "./vault-search-filter";
import { FilterList } from "@/components/filter-list";
import { UploadDocumentDialog } from "./upload-document-dialog";

type VaultHeaderProps = {
  documents?: any[];
  teamId: string;
};

export function VaultHeader({ documents = [], teamId }: VaultHeaderProps) {
  const { params, setParams } = useVaultParams();
  const [isPending, startTransition] = useTransition();
  const { selectedDocuments, selectAll, clearSelection } = useVaultStore();

  const allDocumentIds = documents.map((doc) => doc.id);
  const allSelected = allDocumentIds.length > 0 && 
    allDocumentIds.every((id) => selectedDocuments.has(id));
  const someSelected = selectedDocuments.size > 0 && !allSelected;

  const handleSearch = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    const query = formData.get("q") as string;

    startTransition(() => {
      setParams({ q: query || null });
    });
  };

  const triggerFileUpload = () => {
    const input = document.getElementById("upload-files") as HTMLInputElement;
    if (input) {
      input.click();
    }
  };

  const handleSelectAll = () => {
    if (allSelected) {
      clearSelection();
    } else {
      selectAll(allDocumentIds);
    }
  };

  const validFilters = Object.fromEntries(
    Object.entries(params).filter(([key]) => key !== "q" && key !== "view"),
  );

  return (
    <div className="flex justify-between py-6">
      <div className="flex space-x-4 items-center">
        {/* Select All Checkbox */}
        {documents.length > 0 && (
          <Checkbox
            checked={allSelected}
            onCheckedChange={handleSelectAll}
            className="data-[state=indeterminate]:bg-primary"
            aria-label="Select all documents"
            // Show indeterminate state when some are selected
            {...(someSelected && { "data-state": "indeterminate" })}
          />
        )}

        <form className="relative" onSubmit={handleSearch}>
          <Search className="absolute pointer-events-none left-3 top-[11px] h-4 w-4" />
          <Input
            name="q"
            placeholder="Search or type filter"
            className="pl-9 w-full md:w-[350px] pr-8"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
            defaultValue={params.q || ""}
          />
          
          {/* Filter Icon inside search */}
          <div className="absolute right-3 top-[11px]">
            <VaultSearchFilter />
          </div>
        </form>

        {/* Active filters */}
        <FilterList
          filters={validFilters}
          loading={isPending}
          onRemove={setParams}
        />
      </div>

      <div className="space-x-2 flex items-center">
        {/* View Toggle */}
        <ToggleGroup
          type="single"
          value={params.view || "grid"}
          onValueChange={(value) => {
            if (value) {
              startTransition(() => {
                setParams({ view: value as "grid" | "list" });
              });
            }
          }}
          className="hidden md:flex"
        >
          <ToggleGroupItem value="grid" aria-label="Grid view" size="sm">
            <Grid3x3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem value="list" aria-label="List view" size="sm">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <UploadDocumentDialog teamId={teamId} />
      </div>
    </div>
  );
}
