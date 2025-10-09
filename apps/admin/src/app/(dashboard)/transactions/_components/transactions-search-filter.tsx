"use client";

import { useEffect, useRef, useState, useMemo } from "react";
import { trpc } from '@/lib/trpc/client';
import { useHotkeys } from "react-hotkeys-hook";
import { formatISO } from "date-fns";
import { cn } from "@/lib/utils";
import { Input } from "@/components/ui/input";
import { Calendar } from "@/components/ui/calendar";
import { Slider } from "@/components/ui/slider";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
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
        <span className="text-sm font-medium">{title}</span>
      </div>
      <div className="space-y-2">
        {children}
      </div>
    </div>
  );
}

function FilterCheckbox({ id, label, checked, onCheckedChange }: FilterCheckboxProps) {
  return (
    <div className="flex items-center space-x-2">
      <Checkbox
        id={id}
        checked={checked}
        onCheckedChange={onCheckedChange}
      />
      <label
        htmlFor={id}
        className="text-sm font-normal cursor-pointer leading-none peer-disabled:cursor-not-allowed peer-disabled:opacity-70"
      >
        {label}
      </label>
    </div>
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
    <div className="space-y-4">
      {/* Search Bar with Filter Toggle */}
      <div className="flex items-center gap-4">
        <form
          className="relative flex-1"
          onSubmit={(e) => {
            e.preventDefault();
            handleSubmit();
          }}
        >
          <Icons.Search className="absolute pointer-events-none left-3 top-[11px] h-4 w-4" />
          <Input
            ref={inputRef}
            placeholder={placeholder}
            className="pl-9 pr-4"
            value={prompt}
            onChange={handleSearch}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
        </form>
        
        <Button
          variant={isOpen ? "default" : "outline"}
          size="sm"
          onClick={() => setIsOpen(!isOpen)}
          className={cn(
            "transition-all duration-200",
            hasValidFilters && "bg-primary text-primary-foreground"
          )}
        >
          {streaming ? (
            <Icons.Refresh className="h-4 w-4 animate-spin mr-2" />
          ) : (
            <Icons.Filter className="h-4 w-4 mr-2" />
          )}
          Filters
        </Button>
      </div>

      {/* Applied Filters */}
      <FilterList
        filters={current}
        onRemoveFilter={handleRemoveFilter}
        onClearAll={handleClearAll}
        loading={streaming}
      />

      {/* Expandable Filter Section */}
      {isOpen && (
        <div className="border rounded-lg p-6 bg-card animate-in slide-in-from-top-1 duration-200">
          <div className="flex flex-wrap gap-8 items-start">
            
            <FilterSection title="Date Range" icon={Icons.CalendarMonth}>
              <div className="w-[280px]">
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
            </FilterSection>

            <FilterSection title="Amount Range" icon={Icons.Currency}>
              <div className="w-[200px] space-y-4">
                <div className="flex items-center justify-between text-sm">
                  <span>Range</span>
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
            </FilterSection>

            <FilterSection title="Status" icon={Icons.Status}>
              <div className="w-[140px] space-y-2">
                {(["completed", "pending", "failed", "cancelled"] as const).map((status) => (
                  <FilterCheckbox
                    key={status}
                    id={status}
                    label={status.charAt(0).toUpperCase() + status.slice(1)}
                    checked={current.statuses?.includes(status) ?? false}
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

            <FilterSection title="Attachments" icon={Icons.Attachments}>
              <div className="w-[140px] space-y-2">
                <FilterCheckbox
                  id="has-attachments"
                  label="Has attachments"
                  checked={current.hasAttachments === true}
                  onCheckedChange={(checked) =>
                    patch({ hasAttachments: checked ? true : undefined })
                  }
                />
                <FilterCheckbox
                  id="no-attachments"
                  label="No attachments"
                  checked={current.hasAttachments === false}
                  onCheckedChange={(checked) =>
                    patch({ hasAttachments: checked ? false : undefined })
                  }
                />
              </div>
            </FilterSection>

            <FilterSection title="Categories" icon={Icons.Category}>
              <div className="w-[180px] max-h-[200px] overflow-y-auto space-y-2">
                {categories && categories.length > 0 ? (
                  categories.map((category: any) => (
                    <FilterCheckbox
                      key={category.id}
                      id={category.id}
                      label={category.name}
                      checked={current.categories?.includes(category.slug) ?? false}
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
                  <p className="text-sm text-muted-foreground">No categories found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection title="Tags" icon={Icons.Status}>
              <div className="w-[160px] max-h-[200px] overflow-y-auto space-y-2">
                {tags && tags.length > 0 ? (
                  tags.map((tag: any) => (
                    <FilterCheckbox
                      key={tag.id}
                      id={tag.id}
                      label={tag.name}
                      checked={current.tags?.includes(tag.id) ?? false}
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
                  <p className="text-sm text-muted-foreground">No tags found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection title="Accounts" icon={Icons.Accounts}>
              <div className="w-[180px] max-h-[200px] overflow-y-auto space-y-2">
                {financialAccounts && financialAccounts.length > 0 ? (
                  financialAccounts.map((account: any) => (
                    <FilterCheckbox
                      key={account.id}
                      id={account.id}
                      label={`${account.name} (${account.currency})`}
                      checked={current.accounts?.includes(account.id) ?? false}
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
                  <p className="text-sm text-muted-foreground">No accounts found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection title="Assignees" icon={Icons.AccountCircle}>
              <div className="w-[160px] max-h-[200px] overflow-y-auto space-y-2">
                {teamMembers && teamMembers.length > 0 ? (
                  teamMembers.map((member: any) => (
                    <FilterCheckbox
                      key={member.id}
                      id={member.id}
                      label={member.fullName || member.email || "Unknown"}
                      checked={current.assignees?.includes(member.id) ?? false}
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
                  <p className="text-sm text-muted-foreground">No team members found</p>
                )}
              </div>
            </FilterSection>

            <FilterSection title="Recurring" icon={Icons.Repeat}>
              <div className="w-[120px] space-y-2">
                <FilterCheckbox
                  id="recurring-all"
                  label="All recurring"
                  checked={current.isRecurring === true}
                  onCheckedChange={(checked) =>
                    patch({ isRecurring: checked ? true : undefined })
                  }
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
