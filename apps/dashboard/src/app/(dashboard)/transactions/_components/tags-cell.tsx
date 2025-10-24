"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, X } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { cn } from "@/lib/utils";
import { trpc } from "@/lib/trpc/client";
import type { RouterOutputs } from "@Faworra/api/trpc/routers/_app";

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
    [allTags, local],
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
      <Popover open={open} onOpenChange={(o) => { setOpen(o); if (!o) setInputValue(""); }}>
        <PopoverTrigger asChild>
          <button
            type="button"
            className="w-full min-h-[24px] h-auto rounded-sm hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring px-1"
            aria-label="Edit tags"
            data-row-click-exempt
          >
            {displayTags.length > 0 ? (
              <div className="flex items-center gap-1 overflow-x-auto scrollbar-hide py-0.5">
                {displayTags.map((t) => (
                  <span key={t.id} className="relative group flex-shrink-0" data-row-click-exempt>
                    <Badge variant="tag-rounded" className="whitespace-nowrap pr-5">{t.name}</Badge>
                    <span
                      role="button"
                      aria-label="Remove tag"
                      className="absolute -top-1 -right-1 hidden group-hover:flex h-4 w-4 items-center justify-center rounded-full bg-muted text-muted-foreground hover:bg-foreground hover:text-background cursor-pointer"
                      data-row-click-exempt
                      onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        removeInline(t.id);
                      }}
                    >
                      <X className="h-3 w-3" />
                    </span>
                  </span>
                ))}
              </div>
            ) : null}
          </button>
        </PopoverTrigger>
        <PopoverContent align="start" className="p-0 w-72" data-row-click-exempt>
          <Command loop shouldFilter={false}>
            <CommandInput
              value={inputValue}
              onValueChange={setInputValue}
              placeholder="Search..."
              className="px-3"
              autoFocus
            />
            <CommandGroup>
              <CommandList className="max-h-[225px] overflow-auto">
                {filtered.map((t) => (
                  <CommandItem
                    key={t.id}
                    value={t.id}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
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
                          setDisplayTags((prev) => [...prev, { 
                            id: found.id, 
                            name: found.name, 
                            color: found.color as string | null 
                          }]);
                        }
                        addTag.mutate({ transactionId, tagId: id });
                      }
                    }}
                    className="cursor-pointer"
                  >
                    <Check className={cn("mr-2 h-4 w-4", local.has(t.id) ? "opacity-100" : "opacity-0")} />
                    {t.name}
                  </CommandItem>
                ))}
                <CommandEmpty>No tags</CommandEmpty>
                {showCreate && (
                  <CommandItem
                    key={inputValue}
                    value={inputValue}
                    onSelect={async () => {
                      const name = inputValue.trim();
                      if (!name) return;
                      try {
                        const row = await createTag.mutateAsync({ name, color: null });
                        setLocal((prev) => new Set(prev).add(row.id as string));
                        setDisplayTags((prev) => [...prev, { 
                          id: row.id as string, 
                          name: row.name as string, 
                          color: (row as { color?: string | null }).color ?? null 
                        }]);
                        addTag.mutate({ transactionId, tagId: row.id as string });
                        setOpen(false);
                        setInputValue("");
                      } catch {
                        // Error handled by mutation
                      }
                    }}
                    onMouseDown={(e) => { e.preventDefault(); e.stopPropagation(); }}
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