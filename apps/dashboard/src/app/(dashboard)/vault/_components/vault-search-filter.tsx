"use client";

import { useState } from "react";
import { Filter, Calendar as CalendarIcon } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Calendar } from "@/components/ui/calendar";
import { useVaultParams } from "@/hooks/use-vault-params";
import { trpc } from "@/lib/trpc/client";
import { formatISO } from "date-fns";
import { cn } from "@/lib/utils";

export function VaultSearchFilter() {
  const { params, setParams } = useVaultParams();
  const [isOpen, setIsOpen] = useState(false);

  // Fetch all available tags
  const { data: allTags = [] } = trpc.documents.tags.useQuery(undefined, {
    enabled: isOpen || Boolean(params.tags?.length),
  });

  const hasValidFilters = Boolean(params.tags?.length || params.start || params.end);

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className={cn(
            "opacity-50 transition-opacity duration-300 hover:opacity-100",
            hasValidFilters && "opacity-100",
            isOpen && "opacity-100",
          )}
        >
          <Filter className="h-4 w-4" />
        </button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="w-[350px]" align="end" sideOffset={10} side="bottom">
        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <CalendarIcon className="mr-2 h-4 w-4" />
              <span>Date</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent sideOffset={14} alignOffset={-4} className="p-0">
                <Calendar
                  mode="range"
                  initialFocus
                  toDate={new Date()}
                  selected={
                    params.start || params.end
                      ? {
                          from: params.start ? new Date(params.start) : undefined,
                          to: params.end ? new Date(params.end) : undefined,
                        }
                      : undefined
                  }
                  onSelect={(range) => {
                    if (!range) return;

                    const newRange = {
                      start: range.from
                        ? formatISO(range.from, { representation: "date" })
                        : params.start || null,
                      end: range.to
                        ? formatISO(range.to, { representation: "date" })
                        : params.end || null,
                    };

                    setParams(newRange);
                  }}
                />
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>

        <DropdownMenuGroup>
          <DropdownMenuSub>
            <DropdownMenuSubTrigger>
              <Filter className="mr-2 h-4 w-4" />
              <span>Tags</span>
            </DropdownMenuSubTrigger>
            <DropdownMenuPortal>
              <DropdownMenuSubContent
                sideOffset={14}
                alignOffset={-4}
                className="p-0 max-h-[300px] overflow-y-auto"
              >
                {allTags.map(({ tag }) => (
                  <DropdownMenuCheckboxItem
                    key={tag}
                    checked={params.tags?.includes(tag)}
                    onCheckedChange={() => {
                      setParams({
                        tags: params.tags?.includes(tag)
                          ? params.tags.filter((t) => t !== tag)
                          : [...(params.tags ?? []), tag],
                      });
                    }}
                  >
                    {tag}
                  </DropdownMenuCheckboxItem>
                ))}

                {!allTags.length && <DropdownMenuItem disabled>No tags found</DropdownMenuItem>}
              </DropdownMenuSubContent>
            </DropdownMenuPortal>
          </DropdownMenuSub>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
