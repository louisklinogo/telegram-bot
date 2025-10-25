"use client";

import { Label } from "@Faworra/ui/label";
import { Filter, X } from "lucide-react";
import { useState, useTransition } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { useVaultParams } from "@/hooks/use-vault-params";
import { trpc } from "@/lib/trpc/client";

type FilterDialogProps = {
  trigger?: React.ReactNode;
};

export function FilterDialog({ trigger }: FilterDialogProps) {
  const { params, setParams } = useVaultParams();
  const [isOpen, setIsOpen] = useState(false);
  const [isPending, startTransition] = useTransition();
  const [selectedTags, setSelectedTags] = useState<string[]>(params.tags || []);

  // Fetch available tags
  const { data: availableTags = [] } = trpc.documents.tags.useQuery(undefined, {
    enabled: isOpen,
  });

  const toggleTag = (tag: string) => {
    setSelectedTags((prev) =>
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag]
    );
  };

  const handleApplyFilters = () => {
    startTransition(() => {
      setParams({
        tags: selectedTags.length > 0 ? selectedTags : null,
      });
    });
    setIsOpen(false);
  };

  const handleClearFilters = () => {
    setSelectedTags([]);
    startTransition(() => {
      setParams({
        q: null,
        tags: null,
      });
    });
    setIsOpen(false);
  };

  const hasActiveFilters = params.q || (params.tags && params.tags.length > 0);

  return (
    <Dialog onOpenChange={setIsOpen} open={isOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button className="h-9 gap-2" size="sm" variant="ghost">
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <Badge className="h-5 px-1 text-xs" variant="secondary">
                {(params.tags?.length || 0) + (params.q ? 1 : 0)}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Documents</DialogTitle>
          <DialogDescription>Refine your document search with these filters</DialogDescription>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Tags Filter */}
          <div className="space-y-3">
            <Label>Filter by Tags</Label>
            {availableTags.length > 0 ? (
              <div className="flex flex-wrap gap-2">
                {availableTags.map((tagData: any) => {
                  const tag = tagData.tag;
                  const isSelected = selectedTags.includes(tag);
                  return (
                    <Badge
                      className="cursor-pointer transition-colors hover:bg-accent"
                      key={tag}
                      onClick={() => toggleTag(tag)}
                      variant={isSelected ? "default" : "outline"}
                    >
                      {tag} ({tagData.count}){isSelected && <X className="ml-1 h-3 w-3" />}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-muted-foreground text-sm">
                No tags available yet. Add tags to your documents to filter by them.
              </p>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {params.q && <Badge variant="secondary">Search: {params.q}</Badge>}
                {params.tags?.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    Tag: {tag}
                  </Badge>
                ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-2 sm:gap-0">
          {hasActiveFilters && (
            <Button disabled={isPending} onClick={handleClearFilters} variant="ghost">
              Clear All
            </Button>
          )}
          <Button disabled={isPending} onClick={handleApplyFilters}>
            {isPending ? "Applying..." : "Apply Filters"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
