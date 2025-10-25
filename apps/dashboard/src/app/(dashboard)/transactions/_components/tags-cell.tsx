"use client";

import type { RouterOutputs } from "@Faworra/api/trpc/routers/_app";
import { Check, X } from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@/components/ui/command";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";

type Tag = { id: string; name: string; color: string | null };

type TagsCellProps = {
  transactionId: string;
  initialTags: Tag[];
};

/**
 * Inline tags editor for transaction rows
 * Allows adding, removing, and creating tags with a popover interface
 */
export function TagsCell({ transactionId, initialTags }: TagsCellProps) {
  const utils = trpc.useUtils();
  const [open, setOpen] = useState(false);
  const { data: allTags = [] } = trpc.tags.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
    gcTime: 300_000, // Keep in cache for 5 minutes
  });
  const [local, setLocal] = useState<Set<string>>(() => new Set(initialTags.map((t) => t.id)));
  const [displayTags, setDisplayTags] = useState<Tag[]>(initialTags);
  const [inputValue, setInputValue] = useState("");

  const addTag = trpc.transactionTags.add.useMutation({
    onSuccess: async () => {
      await utils.transactions.enrichedList.invalidate();
    },
  });

  const removeTag = trpc.transactionTags.remove.useMutation({
    onSuccess: async () => {
      await utils.transactions.enrichedList.invalidate();
    },
  });

  const createTag = trpc.tags.create.useMutation({
    onSuccess: async () => {
      await utils.tags.list.invalidate();
    },
  });

  type TagRow = RouterOutputs["tags"]["list"][number];
  const selectedTags = useMemo(
    () => (allTags as TagRow[]).filter((t) => local.has(t.id)),
    [allTags, local]
  );

  // Keep local state in sync with incoming server data
  useEffect(() => {
    const incomingIds = new Set(initialTags.map((t) => t.id));
    // If the sets differ in size or contents, sync
    if (incomingIds.size !== local.size || Array.from(incomingIds).some((id) => !local.has(id))) {
      setLocal(incomingIds);
      setDisplayTags(initialTags);
    }
  }, [initialTags, local]);

  const items = allTags as TagRow[];
  const filtered = useMemo(() => {
    const q = inputValue.toLowerCase();
    return items.filter((i) => (i.name || "").toLowerCase().includes(q));
  }, [items, inputValue]);

  const showCreate = Boolean(inputValue.trim()) && filtered.length === 0;

  const removeInline = (id: string) => {
    setLocal((prev) => {
      const next = new Set(prev);
      next.delete(id);
      return next;
    });
    setDisplayTags((prev) => prev.filter((x) => x.id !== id));
    removeTag.mutate({ transactionId, tagId: id });
  };

  return (
    <div className="max-w-[260px]">
      <Popover
        onOpenChange={(o) => {
          setOpen(o);
          if (!o) setInputValue("");
        }}
        open={open}
      >
        <PopoverTrigger asChild>
          <button
            aria-label="Edit tags"
            className="h-auto min-h-[24px] w-full rounded-sm px-1 hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
            data-row-click-exempt
            type="button"
          >
            {displayTags.length > 0 ? (
              <div className="scrollbar-hide flex items-center gap-1 overflow-x-auto py-0.5">
                {displayTags.map((t) => (
                  <span className="group relative flex-shrink-0" data-row-click-exempt key={t.id}>
                    <Badge className="whitespace-nowrap pr-5" variant="tag-rounded">
                      {t.name}
                    </Badge>
                    <span
                      aria-label="Remove tag"
                      className="-top-1 -right-1 absolute hidden h-4 w-4 cursor-pointer items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background group-hover:flex"
                      data-row-click-exempt
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeInline(t.id);
                      }}
                      onMouseDown={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                      }}
                      role="button"
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="w-72 p-0" data-row-click-exempt>
          <Command loop shouldFilter={false}>
            <CommandInput
              autoFocus
              className="px-3"
              onValueChange={setInputValue}
              placeholder="Search..."
              value={inputValue}
            />
            <CommandGroup>
              <CommandList className="max-h-[225px] overflow-auto">
                {filtered.map((t) => (
                  <CommandItem
                    className="cursor-pointer"
                    key={t.id}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={(id) => {
                      const checked = local.has(id);
                      if (checked) {
                        setLocal((prev) => {
                          const next = new Set(prev);
                          next.delete(id);
                          return next;
                        });
                        setDisplayTags((prev) => prev.filter((x) => x.id !== id));
                        removeTag.mutate({ transactionId, tagId: id });
                      } else {
                        setLocal((prev) => new Set(prev).add(id));
                        const found = items.find((it) => it.id === id);
                        if (found) {
                          setDisplayTags((prev) => [
                            ...prev,
                            {
                              id: found.id,
                              name: found.name,
                              color: found.color as string | null,
                            },
                          ]);
                        }
                        addTag.mutate({ transactionId, tagId: id });
                      }
                    }}
                    value={t.id}
                  >
                    <Check
                      className={cn("mr-2 h-4 w-4", local.has(t.id) ? "opacity-100" : "opacity-0")}
                    />
                    {t.name}
                  </CommandItem>
                ))}
                <CommandEmpty>No tags</CommandEmpty>
                {showCreate && (
                  <CommandItem
                    key={inputValue}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                    }}
                    onSelect={async () => {
                      const name = inputValue.trim();
                      if (!name) return;
                      try {
                        const row = await createTag.mutateAsync({ name, color: null });
                        setLocal((prev) => new Set(prev).add(row.id as string));
                        setDisplayTags((prev) => [
                          ...prev,
                          {
                            id: row.id as string,
                            name: row.name as string,
                            color: (row as { color?: string | null }).color ?? null,
                          },
                        ]);
                        addTag.mutate({ transactionId, tagId: row.id as string });
                        setOpen(false);
                        setInputValue("");
                      } catch {
                        // Error handled by mutation
                      }
                    }}
                    value={inputValue}
                  >
                    Create "{inputValue}"
                  </CommandItem>
                )}
              </CommandList>
            </CommandGroup>
          </Command>
        </PopoverContent>
      </Popover>
    </div>
  );
}
