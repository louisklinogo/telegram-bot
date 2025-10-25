"use client";

import { formatISO } from "date-fns";
import { useEffect, useMemo, useRef, useState } from "react";
import { useHotkeys } from "react-hotkeys-hook";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import { Checkbox } from "@/components/ui/checkbox";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Separator } from "@/components/ui/separator";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc/client";
import { cn } from "@/lib/utils";
import { FilterList } from "./filter-list";
import type { FilterState, TransactionsSearchFilterProps } from "./types";

type Props = TransactionsSearchFilterProps & {
  showSearchInput?: boolean;
  showFilterButton?: boolean;
};

const PLACEHOLDERS = [
  "Software and taxes last month",
  "Income last year",
  "Software last Q4",
  "From Google without receipt",
  "Search or filter",
  "Without receipts this month",
];

interface FilterSectionProps {
  title: string;
  icon: React.ComponentType<any>;
  children: React.ReactNode;
}

interface FilterCheckboxProps {
  id: string;
  label: string;
  checked: boolean;
  onCheckedChange: (checked: boolean) => void;
}

function FilterSection({ title, icon: Icon, children }: FilterSectionProps) {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2">
        <Icon className="h-4 w-4 text-muted-foreground" />
        <span className="font-medium text-sm">{title}</span>
      </div>
      <div className="space-y-2">{children}</div>
    </div>
  );
}

function FilterCheckbox({ id, label, checked, onCheckedChange }: FilterCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox checked={checked} id={id} onCheckedChange={onCheckedChange} />
      <label
        className="cursor-pointer font-normal text-sm leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
        htmlFor={id}
      >
        {label}
      </label>
    </div>
  );
}

export function TransactionsSearchFilter({
  value,
  onChange,
  onAskAI,
  currency = "GHS",
  showSearchInput = true,
  showFilterButton = true,
}: Props) {
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
    if (key === "statuses" && value) {
      const newStatuses = current.statuses?.filter((s) => s !== value);
      patch({ statuses: newStatuses?.length ? newStatuses : undefined });
    } else if (key === "categories" && value) {
      const newCategories = current.categories?.filter((c) => c !== value);
      patch({ categories: newCategories?.length ? newCategories : undefined });
    } else if (key === "tags" && value) {
      const newTags = current.tags?.filter((t) => t !== value);
      patch({ tags: newTags?.length ? newTags : undefined });
    } else if (key === "accounts" && value) {
      const newAccounts = current.accounts?.filter((a) => a !== value);
      patch({ accounts: newAccounts?.length ? newAccounts : undefined });
    } else if (key === "assignees" && value) {
      const newAssignees = current.assignees?.filter((a) => a !== value);
      patch({ assignees: newAssignees?.length ? newAssignees : undefined });
    } else {
      patch({ [key]: undefined });
    }
  };

  const handleClearAll = () => {
    onChange({ limit: 50 });
    setPrompt("");
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
    }
  );

  useHotkeys("meta+s", (evt) => {
    evt.preventDefault();
    inputRef.current?.focus();
  });

  // Allow external toggle (from toolbar button)
  useEffect(() => {
    const handler = () => setIsOpen((v) => !v);
    document.addEventListener("transactions:toggle-filters", handler as any);
    return () => document.removeEventListener("transactions:toggle-filters", handler as any);
  }, []);

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
    Object.entries(current).filter(([key]) => key !== "search" && key !== "limit")
  );
  const hasValidFilters = Object.values(validFilters).some(
    (value) =>
      value !== null && value !== undefined && (Array.isArray(value) ? value.length > 0 : true)
  );

  return (
    <div className="space-y-4">
      {/* Search Bar with Filter Toggle */}
      <div className="flex items-center gap-4">
        {showSearchInput && (
          <form
            className="relative flex-1"
            onSubmit={(e) => {
              e.preventDefault();
              handleSubmit();
            }}
          >
            <Icons.Search className="pointer-events-none absolute top-[11px] left-3 h-4 w-4" />
            <Input
              autoCapitalize="none"
              autoComplete="off"
              autoCorrect="off"
              className="pr-4 pl-9"
              onBlur={() => setIsFocused(false)}
              onChange={handleSearch}
              onFocus={() => setIsFocused(true)}
              placeholder={placeholder}
              ref={inputRef}
              spellCheck="false"
              value={prompt}
            />
          </form>
        )}

        {showFilterButton && (
          <Button
            className={cn(
              "transition-all duration-200",
              hasValidFilters && "bg-primary text-primary-foreground"
            )}
            onClick={() => setIsOpen(!isOpen)}
            size="sm"
            variant={isOpen ? "default" : "outline"}
          >
            {streaming ? (
              <Icons.Refresh className="mr-2 h-4 w-4 animate-spin" />
            ) : (
              <Icons.Filter className="mr-2 h-4 w-4" />
            )}
            Filters
          </Button>
        )}
      </div>

      {/* Applied Filters */}
      <FilterList
        currency={currency}
        filters={current}
        loading={streaming}
        onClearAll={handleClearAll}
        onRemoveFilter={handleRemoveFilter}
      />

      {/* Expandable Filter Section */}
      {isOpen && (
        <div className="slide-in-from-top-1 animate-in rounded-lg border bg-card p-6 duration-200">
          <div className="flex flex-wrap items-start gap-4 sm:gap-6 lg:gap-8">
            <FilterSection icon={Icons.CalendarMonth} title="Date Range">
              <div className="w-full min-w-[240px] sm:w-[280px]">
                <Calendar
                  initialFocus
                  mode="range"
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
                  selected={{
                    from: current.startDate ? new Date(current.startDate) : undefined,
                    to: current.endDate ? new Date(current.endDate) : undefined,
                  }}
                  toDate={new Date()}
                />
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Currency} title="Amount Range">
              <div className="w-full min-w-[180px] space-y-4 sm:w-[200px]">
                <div className="flex items-center justify-between text-sm">
                  <span>Range</span>
                  <span className="text-muted-foreground">
                    {currency} {current.amountMin || 0} - {currency} {current.amountMax || 10_000}
                  </span>
                </div>
                <Slider
                  className="w-full"
                  max={10_000}
                  min={0}
                  onValueChange={([min, max]) => {
                    patch({
                      amountMin: min > 0 ? min : undefined,
                      amountMax: max < 10_000 ? max : undefined,
                    });
                  }}
                  step={50}
                  value={[current.amountMin || 0, current.amountMax || 10_000]}
                />
                <div className="flex justify-between text-muted-foreground text-xs">
                  <span>{currency} 0</span>
                  <span>{currency} 10,000</span>
                </div>
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Status} title="Status">
              <div className="w-full min-w-[120px] space-y-2 sm:w-[140px]">
                {(["completed", "pending", "failed", "cancelled"] as const).map((status) => (
                  <FilterCheckbox
                    checked={current.statuses?.includes(status) ?? false}
                    id={status}
                    key={status}
                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                    onCheckedChange={(checked) => {
                      const currentStatuses = current.statuses || [];
                      const newStatuses = checked
                        ? [...currentStatuses, status]
                        : currentStatuses.filter((s) => s !== status);
                      patch({ statuses: newStatuses.length > 0 ? newStatuses : undefined });
                    }}
                  />
                ))}
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Attachments} title="Attachments">
              <div className="w-full min-w-[120px] space-y-2 sm:w-[140px]">
                <FilterCheckbox
                  checked={current.hasAttachments === true}
                  id="has-attachments"
                  label="Has attachments"
                  onCheckedChange={(checked) =>
                    patch({ hasAttachments: checked ? true : undefined })
                  }
                />
                <FilterCheckbox
                  checked={current.hasAttachments === false}
                  id="no-attachments"
                  label="No attachments"
                  onCheckedChange={(checked) =>
                    patch({ hasAttachments: checked ? false : undefined })
                  }
                />
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Category} title="Categories">
              <div className="max-h-[200px] w-full min-w-[150px] space-y-2 overflow-y-auto sm:w-[180px]">
                {categories && categories.length > 0 ? (
                  categories.map((category: any) => (
                    <FilterCheckbox
                      checked={current.categories?.includes(category.slug) ?? false}
                      id={category.id}
                      key={category.id}
                      label={category.name}
                      onCheckedChange={(checked) => {
                        const currentCategories = current.categories || [];
                        const newCategories = checked
                          ? [...currentCategories, category.slug]
                          : currentCategories.filter((s) => s !== category.slug);
                        patch({ categories: newCategories.length > 0 ? newCategories : undefined });
                      }}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No categories found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Status} title="Tags">
              <div className="max-h-[200px] w-full min-w-[140px] space-y-2 overflow-y-auto sm:w-[160px]">
                {tags && tags.length > 0 ? (
                  tags.map((tag: any) => (
                    <FilterCheckbox
                      checked={current.tags?.includes(tag.id) ?? false}
                      id={tag.id}
                      key={tag.id}
                      label={tag.name}
                      onCheckedChange={(checked) => {
                        const currentTags = current.tags || [];
                        const newTags = checked
                          ? [...currentTags, tag.id]
                          : currentTags.filter((t) => t !== tag.id);
                        patch({ tags: newTags.length > 0 ? newTags : undefined });
                      }}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No tags found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Accounts} title="Accounts">
              <div className="max-h-[200px] w-full min-w-[150px] space-y-2 overflow-y-auto sm:w-[180px]">
                {financialAccounts && financialAccounts.length > 0 ? (
                  financialAccounts.map((account: any) => (
                    <FilterCheckbox
                      checked={current.accounts?.includes(account.id) ?? false}
                      id={account.id}
                      key={account.id}
                      label={`${account.name} (${account.currency})`}
                      onCheckedChange={(checked) => {
                        const currentAccounts = current.accounts || [];
                        const newAccounts = checked
                          ? [...currentAccounts, account.id]
                          : currentAccounts.filter((a) => a !== account.id);
                        patch({ accounts: newAccounts.length > 0 ? newAccounts : undefined });
                      }}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No accounts found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection icon={Icons.AccountCircle} title="Assignees">
              <div className="max-h-[200px] w-full min-w-[140px] space-y-2 overflow-y-auto sm:w-[160px]">
                {teamMembers && teamMembers.length > 0 ? (
                  teamMembers.map((member: any) => (
                    <FilterCheckbox
                      checked={current.assignees?.includes(member.id) ?? false}
                      id={member.id}
                      key={member.id}
                      label={member.fullName || member.email || "Unknown"}
                      onCheckedChange={(checked) => {
                        const currentAssignees = current.assignees || [];
                        const newAssignees = checked
                          ? [...currentAssignees, member.id]
                          : currentAssignees.filter((a) => a !== member.id);
                        patch({ assignees: newAssignees.length > 0 ? newAssignees : undefined });
                      }}
                    />
                  ))
                ) : (
                  <p className="text-muted-foreground text-sm">No team members found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection icon={Icons.Repeat} title="Recurring">
              <div className="w-full min-w-[100px] space-y-2 sm:w-[120px]">
                <FilterCheckbox
                  checked={current.isRecurring === true}
                  id="recurring-all"
                  label="All recurring"
                  onCheckedChange={(checked) => patch({ isRecurring: checked ? true : undefined })}
                />
              </div>
            </FilterSection>
          </div>
        </div>
      )}
    </div>
  );
}

export default TransactionsSearchFilter;
