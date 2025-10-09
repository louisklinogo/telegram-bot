"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { trpc } from '@/lib/trpc/client';
import { useHotkeys } from "react-hotkeys-hook";
import { formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuTrigger,
  DropdownMenuGroup,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
  DropdownMenuCheckboxItem,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { FilterList } from "./filter-list";
import type { FilterState } from "./types";

type Props = {
  value?: FilterState;
  onChange: (next: FilterState) => void;
  onAskAI?: (query: string) => Promise<Partial<FilterState>>;
};

const PLACEHOLDERS = [
  "Software and taxes last month",
  "Income last year",
  "Software last Q4",
  "From Google without receipt",
  "Search or filter",
  "Without receipts this month",
];

interface FilterMenuItemProps {
  icon: React.ComponentType<any>;
  label: string;
  children: React.ReactNode;
}

interface FilterCheckboxItemProps {
  id: string;
  name: string;
  checked?: boolean;
  onCheckedChange: () => void;
}

function FilterMenuItem({ icon: Icon, label, children }: FilterMenuItemProps) {
  return (
    <DropdownMenuGroup>
      <DropdownMenuSub>
        <DropdownMenuSubTrigger>
          <Icon className="mr-2 size-4" />
          <span>{label}</span>
        </DropdownMenuSubTrigger>
        <DropdownMenuPortal>
          <DropdownMenuSubContent sideOffset={14} alignOffset={-4} className="p-0">
            {children}
          </DropdownMenuSubContent>
        </DropdownMenuPortal>
      </DropdownMenuSub>
    </DropdownMenuGroup>
  );
}

function FilterCheckboxItem({
  id,
  name,
  checked = false,
  onCheckedChange,
}: FilterCheckboxItemProps) {
  return (
    <DropdownMenuCheckboxItem key={id} checked={checked} onCheckedChange={onCheckedChange}>
      {name}
    </DropdownMenuCheckboxItem>
  );
}

export function TransactionsSearchFilter({ value, onChange, onAskAI }: Props) {
  const [placeholder, setPlaceholder] = useState("");
  const [streaming, setStreaming] = useState(false);
  const [isOpen, setIsOpen] = useState(false);
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  
  // Fetch filter data
  const { data: categories = [] } = trpc.transactionCategories.list.useQuery();
  const { data: tags = [] } = trpc.tags.list.useQuery();
  const { data: financialAccounts = [] } = trpc.financialAccounts.list.useQuery();
  const { data: teamMembers = [] } = trpc.teams.members.useQuery();

  const current = useMemo<FilterState>(() => ({ limit: 50, ...(value || {}) }), [value]);
  const [prompt, setPrompt] = useState(current.search || "");

  const patch = (p: Partial<FilterState>) => onChange({ ...current, ...p });

  // Handle filter removal
  const handleRemoveFilter = (key: string, value?: string) => {
    if (key === 'statuses' && value) {
      const newStatuses = current.statuses?.filter(s => s !== value);
      patch({ statuses: newStatuses?.length ? newStatuses : undefined });
    } else if (key === 'categories' && value) {
      const newCategories = current.categories?.filter(c => c !== value);
      patch({ categories: newCategories?.length ? newCategories : undefined });
    } else if (key === 'tags' && value) {
      const newTags = current.tags?.filter(t => t !== value);
      patch({ tags: newTags?.length ? newTags : undefined });
    } else if (key === 'accounts' && value) {
      const newAccounts = current.accounts?.filter(a => a !== value);
      patch({ accounts: newAccounts?.length ? newAccounts : undefined });
    } else if (key === 'assignees' && value) {
      const newAssignees = current.assignees?.filter(a => a !== value);
      patch({ assignees: newAssignees?.length ? newAssignees : undefined });
    } else {
      patch({ [key]: undefined });
    }
  };

  const handleClearAll = () => {
    onChange({ limit: 50 });
    setPrompt('');
  };

  // Random placeholder
  useEffect(() => {
    const randomPlaceholder =
      PLACEHOLDERS[Math.floor(Math.random() * PLACEHOLDERS.length)] ?? "Search or filter";
    setPlaceholder(randomPlaceholder);
  }, []);

  // Keyboard shortcuts
  useHotkeys(
    "esc",
    () => {
      setPrompt("");
      onChange({ limit: 50 });
      setIsOpen(false);
    },
    {
      enableOnFormTags: true,
      enabled: Boolean(prompt) && isFocused,
    },
  );

  useHotkeys("meta+s", (evt) => {
    evt.preventDefault();
    inputRef.current?.focus();
  });

  const handleSearch = (evt: React.ChangeEvent<HTMLInputElement>) => {
    const value = evt.target.value;
    setPrompt(value);
    if (!value) {
      patch({ search: undefined });
    }
  };

  const handleSubmit = async () => {
    if (prompt.split(" ").length > 1) {
      // Multi-word: AI processing
      setStreaming(true);

      try {
        if (onAskAI) {
          const parsed = await onAskAI(prompt.trim());
          if (parsed && Object.keys(parsed).length > 0) {
            patch({ search: undefined, ...parsed });
          }
        }
      } catch (error) {
        console.error("AI parsing failed:", error);
      } finally {
        setStreaming(false);
      }
    } else {
      // Single word: direct search
      patch({ search: prompt.length > 0 ? prompt : undefined });
    }
  };

  // Check if we have active filters (excluding search and limit)
  const validFilters = Object.fromEntries(
    Object.entries(current).filter(([key]) => key !== "search" && key !== "limit"),
  );
  const hasValidFilters = Object.values(validFilters).some(
    (value) =>
      value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : true),
  );

  return (
    <DropdownMenu open={isOpen} onOpenChange={setIsOpen}>
      <div className="flex flex-col space-y-2 w-full md:w-auto">
        <form
          className="relative"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Icons.Search className="absolute pointer-events-none left-3 top-[11px] h-4 w-4" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            className="pl-9 w-full sm:w-[350px] pr-8"
            value={prompt}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />

          <DropdownMenuTrigger asChild>
            <button
              onClick={() => setIsOpen((prev) => !prev)}
              type="button"
              className={cn(
                "absolute z-10 right-3 top-[10px] opacity-50 transition-opacity duration-300 hover:opacity-100",
                hasValidFilters && "opacity-100",
                isOpen && "opacity-100",
              )}
            >
              {streaming ? (
                <Icons.Refresh className="h-4 w-4 animate-spin" />
              ) : (
                <Icons.Filter className="h-4 w-4" />
              )}
            </button>
          </DropdownMenuTrigger>
        </form>

        {/* Applied filters */}
        <FilterList
          filters={current}
          onRemoveFilter={handleRemoveFilter}
          onClearAll={handleClearAll}
          loading={streaming}
        />
      </div>

      <DropdownMenuContent
        className="w-[350px]"
        align="end"
        sideOffset={19}
        alignOffset={-11}
        side="bottom"
      >
        <FilterMenuItem icon={Icons.CalendarMonth} label="Date">
          <div className="w-[280px] p-4">
            <Calendar
              mode="range"
              initialFocus
              toDate={new Date()}
              selected={{
                from: current.startDate ? new Date(current.startDate) : undefined,
                to: current.endDate ? new Date(current.endDate) : undefined,
              }}
              onSelect={(range) => {
                if (!range) return;

                const newRange = {
                  startDate: range.from
                    ? formatISO(range.from, { representation: "date" })
                    : undefined,
                  endDate: range.to
                    ? formatISO(range.to, { representation: "date" })
                    : undefined,
                };

                patch(newRange);
              }}
            />
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Currency} label="Amount">
          <div className="w-[280px] p-4 space-y-4">
            <div className="space-y-2">
              <div className="flex items-center justify-between text-sm">
                <span>Amount Range</span>
                <span className="text-muted-foreground">
                  ${current.amountMin || 0} - ${current.amountMax || 10000}
                </span>
              </div>
              <Slider
                value={[current.amountMin || 0, current.amountMax || 10000]}
                onValueChange={([min, max]) => {
                  patch({
                    amountMin: min > 0 ? min : undefined,
                    amountMax: max < 10000 ? max : undefined,
                  });
                }}
                max={10000}
                min={0}
                step={50}
                className="w-full"
              />
              <div className="flex justify-between text-xs text-muted-foreground">
                <span>$0</span>
                <span>$10,000</span>
              </div>
            </div>
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Status} label="Status">
          {(["completed", "pending", "failed", "cancelled"] as const).map((status) => (
            <FilterCheckboxItem
              key={status}
              id={status}
              name={status.charAt(0).toUpperCase() + status.slice(1)}
              checked={current.statuses?.includes(status)}
              onCheckedChange={() => {
                const currentStatuses = current.statuses || [];
                const newStatuses = currentStatuses.includes(status)
                  ? currentStatuses.filter((s) => s !== status)
                  : [...currentStatuses, status];
                patch({ statuses: newStatuses.length > 0 ? newStatuses : undefined });
              }}
            />
          ))}
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Attachments} label="Attachments">
          <FilterCheckboxItem
            id="has-attachments"
            name="Has attachments"
            checked={current.hasAttachments === true}
            onCheckedChange={() =>
              patch({ hasAttachments: current.hasAttachments === true ? undefined : true })
            }
          />
          <FilterCheckboxItem
            id="no-attachments"
            name="No attachments"
            checked={current.hasAttachments === false}
            onCheckedChange={() =>
              patch({ hasAttachments: current.hasAttachments === false ? undefined : false })
            }
          />
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Category} label="Categories">
          <div className="max-h-[400px] overflow-y-auto">
            {categories && categories.length > 0 ? (
              categories.map((category) => (
                <FilterCheckboxItem
                  key={category.id}
                  id={category.id}
                  name={category.name}
                  checked={current.categories?.includes(category.slug)}
                  onCheckedChange={() => {
                    const currentCategories = current.categories || [];
                    const newCategories = currentCategories.includes(category.slug)
                      ? currentCategories.filter((s) => s !== category.slug)
                      : [...currentCategories, category.slug];
                    patch({ categories: newCategories.length > 0 ? newCategories : undefined });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-2">No categories found</p>
            )}
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Status} label="Tags">
          <div className="max-h-[400px] overflow-y-auto">
            {tags && tags.length > 0 ? (
              tags.map((tag: any) => (
                <FilterCheckboxItem
                  key={tag.id}
                  id={tag.id}
                  name={tag.name}
                  checked={current.tags?.includes(tag.id)}
                  onCheckedChange={() => {
                    const currentTags = current.tags || [];
                    const newTags = currentTags.includes(tag.id)
                      ? currentTags.filter((t) => t !== tag.id)
                      : [...currentTags, tag.id];
                    patch({ tags: newTags.length > 0 ? newTags : undefined });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-2">No tags found</p>
            )}
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Accounts} label="Accounts">
          <div className="max-h-[400px] overflow-y-auto">
            {financialAccounts && financialAccounts.length > 0 ? (
              financialAccounts.map((account: any) => (
                <FilterCheckboxItem
                  key={account.id}
                  id={account.id}
                  name={`${account.name} (${account.currency})`}
                  checked={current.accounts?.includes(account.id)}
                  onCheckedChange={() => {
                    const currentAccounts = current.accounts || [];
                    const newAccounts = currentAccounts.includes(account.id)
                      ? currentAccounts.filter((a) => a !== account.id)
                      : [...currentAccounts, account.id];
                    patch({ accounts: newAccounts.length > 0 ? newAccounts : undefined });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-2">No accounts found</p>
            )}
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.AccountCircle} label="Assignees">
          <div className="max-h-[400px] overflow-y-auto">
            {teamMembers && teamMembers.length > 0 ? (
              teamMembers.map((member: any) => (
                <FilterCheckboxItem
                  key={member.id}
                  id={member.id}
                  name={member.fullName || member.email || "Unknown"}
                  checked={current.assignees?.includes(member.id)}
                  onCheckedChange={() => {
                    const currentAssignees = current.assignees || [];
                    const newAssignees = currentAssignees.includes(member.id)
                      ? currentAssignees.filter((a) => a !== member.id)
                      : [...currentAssignees, member.id];
                    patch({ assignees: newAssignees.length > 0 ? newAssignees : undefined });
                  }}
                />
              ))
            ) : (
              <p className="text-sm text-muted-foreground px-2">No team members found</p>
            )}
          </div>
        </FilterMenuItem>

        <FilterMenuItem icon={Icons.Repeat} label="Recurring">
          <FilterCheckboxItem
            id="recurring-all"
            name="All recurring"
            checked={current.isRecurring === true}
            onCheckedChange={() =>
              patch({ isRecurring: current.isRecurring === true ? undefined : true })
            }
          />
        </FilterMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

export default TransactionsSearchFilter;
