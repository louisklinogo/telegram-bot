"use client";

import { Grid3x3, List, Search, Upload } from "lucide-react";
import { useTransition } from "react";
import { FilterList } from "@/components/filter-list";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { ToggleGroup, ToggleGroupItem } from "@/components/ui/toggle-group";
import { useVaultParams } from "@/hooks/use-vault-params";
import { useVaultStore } from "@/stores/vault-store";
import { UploadDocumentDialog } from "./upload-document-dialog";
import { VaultSearchFilter } from "./vault-search-filter";

type VaultHeaderProps = {
  documents?: any[];
  teamId: string;
};

export function VaultHeader({ documents = [], teamId }: VaultHeaderProps) {
  const { params, setParams } = useVaultParams();
  const [isPending, startTransition] = useTransition();
  const { selectedDocuments, selectAll, clearSelection } = useVaultStore();

  const allDocumentIds = documents.map((doc) => doc.id);
  const allSelected =
    allDocumentIds.length > 0 && allDocumentIds.every((id) => selectedDocuments.has(id));
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
    Object.entries(params).filter(([key]) => key !== "q" && key !== "view")
  );

  return (
    <div className="flex justify-between py-6">
      <div className="flex items-center space-x-4">
        {/* Select All Checkbox */}
        {documents.length > 0 && (
          <Checkbox
            aria-label="Select all documents"
            checked={allSelected}
            className="data-[state=indeterminate]:bg-primary"
            onCheckedChange={handleSelectAll}
            // Show indeterminate state when some are selected
            {...(someSelected && { "data-state": "indeterminate" })}
          />
        )}

        <form className="relative" onSubmit={handleSearch}>
          <Search className="pointer-events-none absolute top-[11px] left-3 h-4 w-4" />
          <Input
            autoCapitalize="none"
            autoComplete="off"
            autoCorrect="off"
            className="w-full pr-8 pl-9 md:w-[350px]"
            defaultValue={params.q || ""}
            name="q"
            placeholder="Search or type filter"
            spellCheck="false"
          />

          {/* Filter Icon inside search */}
          <div className="absolute top-[11px] right-3">
            <VaultSearchFilter />
          </div>
        </form>

        {/* Active filters */}
        <FilterList filters={validFilters} loading={isPending} onRemove={setParams} />
      </div>

      <div className="flex items-center space-x-2">
        {/* View Toggle */}
        <ToggleGroup
          className="hidden md:flex"
          onValueChange={(value) => {
            if (value) {
              startTransition(() => {
                setParams({ view: value as "grid" | "list" });
              });
            }
          }}
          type="single"
          value={params.view || "grid"}
        >
          <ToggleGroupItem aria-label="Grid view" size="sm" value="grid">
            <Grid3x3 className="h-4 w-4" />
          </ToggleGroupItem>
          <ToggleGroupItem aria-label="List view" size="sm" value="list">
            <List className="h-4 w-4" />
          </ToggleGroupItem>
        </ToggleGroup>

        <UploadDocumentDialog teamId={teamId} />
      </div>
    </div>
  );
}
