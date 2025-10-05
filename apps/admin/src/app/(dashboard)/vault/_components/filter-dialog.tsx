"use client";

import { useState, useTransition } from "react";
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
import { Label } from "@cimantikos/ui/label";
import { Badge } from "@/components/ui/badge";
import { X, Filter } from "lucide-react";
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
      prev.includes(tag) ? prev.filter((t) => t !== tag) : [...prev, tag],
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
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        {trigger || (
          <Button
            variant="ghost"
            size="sm"
            className="h-9 gap-2"
          >
            <Filter className="h-4 w-4" />
            {hasActiveFilters && (
              <Badge variant="secondary" className="h-5 px-1 text-xs">
                {(params.tags?.length || 0) + (params.q ? 1 : 0)}
              </Badge>
            )}
          </Button>
        )}
      </DialogTrigger>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>Filter Documents</DialogTitle>
          <DialogDescription>
            Refine your document search with these filters
          </DialogDescription>
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
                      key={tag}
                      variant={isSelected ? "default" : "outline"}
                      className="cursor-pointer hover:bg-accent transition-colors"
                      onClick={() => toggleTag(tag)}
                    >
                      {tag} ({tagData.count})
                      {isSelected && (
                        <X className="h-3 w-3 ml-1" />
                      )}
                    </Badge>
                  );
                })}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground">
                No tags available yet. Add tags to your documents to filter by them.
              </p>
            )}
          </div>

          {/* Active Filters Summary */}
          {hasActiveFilters && (
            <div className="space-y-2">
              <Label>Active Filters</Label>
              <div className="flex flex-wrap gap-2">
                {params.q && (
                  <Badge variant="secondary">
                    Search: {params.q}
                  </Badge>
                )}
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
            <Button
              variant="ghost"
              onClick={handleClearFilters}
              disabled={isPending}
            >
              Clear All
            </Button>
          )}
          <Button onClick={handleApplyFilters} disabled={isPending}>
            {isPending ? "Applying..." : "Apply Filters"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
