"use client";

import { useEffect, useMemo, useState } from "react";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";
import { Calendar } from "@/components/ui/calendar";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuPortal,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import { Slider } from "@/components/ui/slider";
import { trpc } from "@/lib/trpc/client";

type Props = {
  values: {
    statuses?: string[];
    categories?: string[];
    tags?: string[];
    accounts?: string[];
    assignees?: string[];
    startDate?: string;
    endDate?: string;
    amountMin?: number;
    amountMax?: number;
    attachments?: "include" | "exclude" | undefined;
  };
  onChange: (next: Partial<Props["values"]>) => void;
  mode?: "icon" | "chip";
  hide?: {
    date?: boolean;
    amount?: boolean;
    statuses?: boolean;
    categories?: boolean;
    tags?: boolean;
    accounts?: boolean;
    assignees?: boolean;
    attachments?: boolean;
  };
};

export function FilterDropdown({ values, onChange, mode = "icon", hide }: Props) {
  const [open, setOpen] = useState(false);
  const [categoryQuery, setCategoryQuery] = useState("");
  const { data: bounds } = trpc.transactions.amountBounds.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });
  const minBound = bounds?.min ?? 0;
  const maxBound = bounds?.max && bounds.max > 0 ? Math.max(bounds.max, 1000) : 500_000;
  const [range, setRange] = useState<[number, number]>([
    values.amountMin ?? minBound,
    values.amountMax ?? maxBound,
  ]);
  const fmt = (n: number) =>
    new Intl.NumberFormat("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(
      Number.isFinite(n) ? n : 0
    );
  const parse = (s: string) => {
    const normalized = s.replace(/,/g, "").trim();
    const n = Number(normalized);
    return Number.isFinite(n) ? n : 0;
  };
  const [minText, setMinText] = useState<string>(fmt(values.amountMin ?? minBound));
  const [maxText, setMaxText] = useState<string>(fmt(values.amountMax ?? maxBound));

  // keep local slider state in sync with incoming values
  useEffect(() => {
    const min = values.amountMin ?? minBound;
    const max = values.amountMax ?? maxBound;
    setRange([min, max]);
    setMinText(fmt(min));
    setMaxText(fmt(max));
  }, [values.amountMin, values.amountMax, minBound, maxBound]);

  // no-op

  const { data: categories = [] } = trpc.transactionCategories.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });
  const { data: tags = [] } = trpc.tags.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });
  const { data: financialAccounts = [] } = trpc.financialAccounts.list.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });
  const { data: teamMembers = [] } = trpc.teams.members.useQuery(undefined, {
    enabled: open,
    staleTime: 60_000,
  });

  const statusOptions = useMemo(
    () => [
      { id: "completed", name: "Completed" },
      { id: "pending", name: "Pending" },
      { id: "failed", name: "Failed" },
      { id: "cancelled", name: "Cancelled" },
    ],
    []
  );

  // Keep dropdown open for multi-selects to allow multiple toggles without closing
  const apply = (update: Partial<Props["values"]>) => {
    onChange(update);
  };

  const derivedHide = hide ?? {
    date: Boolean(values.startDate || values.endDate),
    amount: Boolean(values.amountMin != null || values.amountMax != null),
    statuses: Boolean(values.statuses && values.statuses.length),
    categories: Boolean(values.categories && values.categories.length),
    tags: Boolean(values.tags && values.tags.length),
    accounts: Boolean(values.accounts && values.accounts.length),
    assignees: Boolean(values.assignees && values.assignees.length),
    attachments: Boolean(values.attachments != null),
  };

  return (
    <DropdownMenu onOpenChange={setOpen} open={open}>
      <DropdownMenuTrigger asChild>
        {mode === "icon" ? (
          <Button aria-label="Filters" size="icon" variant="outline">
            <Icons.Filter className="h-4 w-4" />
          </Button>
        ) : (
          <Button aria-label="Add filter" className="gap-1" size="sm" variant="secondary">
            + Filter
          </Button>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent
        align={mode === "chip" ? "start" : "end"}
        alignOffset={mode === "chip" ? 12 : 0}
        className="w-[320px] p-0"
        collisionPadding={32}
        sideOffset={10}
      >
        {/* Date */}
        {!derivedHide.date && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.CalendarMonth className="mr-2 h-4 w-4" />
                <span>Date</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent alignOffset={-4} className="p-2" sideOffset={14}>
                  <Calendar
                    initialFocus
                    mode="range"
                    onSelect={(range: any) => {
                      const start = range?.from ? range.from.toISOString().slice(0, 10) : undefined;
                      let end = range?.to ? range.to.toISOString().slice(0, 10) : undefined;
                      // Single-day selection: treat as start=end for immediate filtering
                      if (start && !end) end = start;
                      onChange({ startDate: start, endDate: end });
                      if (range?.from && range?.to) {
                        setTimeout(() => setOpen(false), 0);
                      }
                    }}
                    selected={{
                      from: values.startDate ? new Date(values.startDate) : undefined,
                      to: values.endDate ? new Date(values.endDate) : undefined,
                    }}
                  />
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Status */}
        {!derivedHide.statuses && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Status className="mr-2 h-4 w-4" />
                <span>Status</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent alignOffset={-4} className="p-1" sideOffset={14}>
                  {statusOptions.map((s) => (
                    <DropdownMenuCheckboxItem
                      checked={Boolean(values.statuses?.includes(s.id))}
                      key={s.id}
                      onCheckedChange={() => {
                        const curr = values.statuses ?? [];
                        const next = curr.includes(s.id)
                          ? curr.filter((v) => v !== s.id)
                          : [...curr, s.id];
                        apply({ statuses: [...next].sort() });
                      }}
                    >
                      {s.name}
                    </DropdownMenuCheckboxItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Amount */}
        {!derivedHide.amount && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Amount className="mr-2 h-4 w-4" />
                <span>Amount</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  alignOffset={-4}
                  className="w-[300px] space-y-2 p-3"
                  sideOffset={14}
                >
                  <div className="text-muted-foreground text-xs">Range</div>
                  <Slider
                    max={maxBound}
                    min={minBound}
                    onValueChange={(next) => {
                      const [nmin, nmax] = next as [number, number];
                      setRange([nmin, nmax]);
                      setMinText(fmt(nmin));
                      setMaxText(fmt(nmax));
                    }}
                    onValueCommit={([min, max]) =>
                      onChange({
                        amountMin: min > minBound ? min : undefined,
                        amountMax: max < maxBound ? max : undefined,
                      })
                    }
                    step={50}
                    value={range}
                  />
                  <div className="flex items-center gap-2">
                    <Input
                      className="h-8 w-28"
                      onBlur={() => {
                        let min = parse(minText);
                        if (!Number.isFinite(min)) min = minBound;
                        min = Math.max(minBound, Math.min(min, range[1]));
                        setRange([min, range[1]]);
                        setMinText(fmt(min));
                        onChange({ amountMin: min > minBound ? min : undefined });
                      }}
                      onChange={(e) => setMinText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                      }}
                      placeholder="Min"
                      type="text"
                      value={minText}
                    />
                    <span className="text-muted-foreground text-xs">to</span>
                    <Input
                      className="h-8 w-28"
                      onBlur={() => {
                        let max = parse(maxText);
                        if (!Number.isFinite(max)) max = maxBound;
                        max = Math.min(maxBound, Math.max(max, range[0]));
                        setRange([range[0], max]);
                        setMaxText(fmt(max));
                        onChange({ amountMax: max < maxBound ? max : undefined });
                      }}
                      onChange={(e) => setMaxText(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") (e.currentTarget as HTMLInputElement).blur();
                      }}
                      placeholder="Max"
                      type="text"
                      value={maxText}
                    />
                  </div>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Categories */}
        {!derivedHide.categories && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Category className="mr-2 h-4 w-4" />
                <span>Categories</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  alignOffset={-4}
                  className="max-h-[360px] w-[320px] overflow-auto p-1"
                  sideOffset={14}
                >
                  <div className="sticky top-0 z-10 bg-popover p-2 pb-1">
                    <Input
                      className="h-8"
                      onChange={(e) => setCategoryQuery(e.target.value)}
                      placeholder="Search categories"
                      value={categoryQuery}
                    />
                  </div>
                  {categories.length > 0 ? (
                    categories
                      .filter((c: any) =>
                        (c?.name ?? "").toLowerCase().includes(categoryQuery.toLowerCase())
                      )
                      .map((category: any) => (
                        <DropdownMenuCheckboxItem
                          checked={Boolean(values.categories?.includes(category.slug))}
                          key={category.id}
                          onCheckedChange={() => {
                            const curr = values.categories ?? [];
                            const slug = category.slug as string;
                            const next = curr.includes(slug)
                              ? curr.filter((v) => v !== slug)
                              : [...curr, slug];
                            apply({ categories: [...next].sort() });
                          }}
                        >
                          <span className="inline-flex items-center gap-2">
                            {category.color ? (
                              <span
                                className="h-2 w-2 rounded-full"
                                style={{ backgroundColor: category.color }}
                              />
                            ) : (
                              <span className="h-2 w-2 rounded-full bg-muted" />
                            )}
                            {category.name}
                          </span>
                        </DropdownMenuCheckboxItem>
                      ))
                  ) : (
                    <div className="px-2 py-1.5 text-muted-foreground text-xs">No categories</div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Tags */}
        {!derivedHide.tags && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Status className="mr-2 h-4 w-4" />
                <span>Tags</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  alignOffset={-4}
                  className="max-h-[300px] overflow-auto p-1"
                  sideOffset={14}
                >
                  {tags.length > 0 ? (
                    tags.map((tag: any) => (
                      <DropdownMenuCheckboxItem
                        checked={Boolean(values.tags?.includes(tag.id))}
                        key={tag.id}
                        onCheckedChange={() => {
                          const curr = values.tags ?? [];
                          const next = curr.includes(tag.id)
                            ? curr.filter((v) => v !== tag.id)
                            : [...curr, tag.id];
                          apply({ tags: [...next].sort() });
                        }}
                      >
                        {tag.name}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-muted-foreground text-xs">No tags</div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Accounts */}
        {!derivedHide.accounts && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Accounts className="mr-2 h-4 w-4" />
                <span>Accounts</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  alignOffset={-4}
                  className="max-h-[300px] overflow-auto p-1"
                  sideOffset={14}
                >
                  {financialAccounts.length > 0 ? (
                    financialAccounts.map((account: any) => (
                      <DropdownMenuCheckboxItem
                        checked={Boolean(values.accounts?.includes(account.id))}
                        key={account.id}
                        onCheckedChange={() => {
                          const curr = values.accounts ?? [];
                          const next = curr.includes(account.id)
                            ? curr.filter((v) => v !== account.id)
                            : [...curr, account.id];
                          apply({ accounts: [...next].sort() });
                        }}
                      >
                        {account.name} {account.currency ? `(${account.currency})` : ""}
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-muted-foreground text-xs">No accounts</div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Assignees */}
        {!derivedHide.assignees && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.AccountCircle className="mr-2 h-4 w-4" />
                <span>Assignees</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent
                  alignOffset={-4}
                  className="max-h-[300px] overflow-auto p-1"
                  sideOffset={14}
                >
                  {teamMembers.length > 0 ? (
                    teamMembers.map((m: any) => (
                      <DropdownMenuCheckboxItem
                        checked={Boolean(values.assignees?.includes(m.id))}
                        key={m.id}
                        onCheckedChange={() => {
                          const curr = values.assignees ?? [];
                          const next = curr.includes(m.id)
                            ? curr.filter((v) => v !== m.id)
                            : [...curr, m.id];
                          onChange({ assignees: [...next].sort() });
                        }}
                      >
                        <span className="inline-flex items-center gap-2">
                          <Avatar className="h-4 w-4">
                            <AvatarFallback className="text-[8px]">
                              {String(m.fullName || m.email || "?")
                                .split(" ")
                                .map((p: string) => p[0])
                                .join("")
                                .toUpperCase()
                                .slice(0, 2)}
                            </AvatarFallback>
                          </Avatar>
                          {m.fullName || m.email || "Unknown"}
                        </span>
                      </DropdownMenuCheckboxItem>
                    ))
                  ) : (
                    <div className="px-2 py-1.5 text-muted-foreground text-xs">No assignees</div>
                  )}
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {/* Attachments */}
        {!derivedHide.attachments && (
          <DropdownMenuGroup>
            <DropdownMenuSub>
              <DropdownMenuSubTrigger>
                <Icons.Attachments className="mr-2 h-4 w-4" />
                <span>Attachments</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent alignOffset={-4} className="p-1" sideOffset={14}>
                  <DropdownMenuCheckboxItem
                    checked={values.attachments === "include"}
                    onCheckedChange={(checked) =>
                      onChange({ attachments: checked ? "include" : undefined })
                    }
                  >
                    Has attachments
                  </DropdownMenuCheckboxItem>
                  <DropdownMenuCheckboxItem
                    checked={values.attachments === "exclude"}
                    onCheckedChange={(checked) =>
                      onChange({ attachments: checked ? "exclude" : undefined })
                    }
                  >
                    No attachments
                  </DropdownMenuCheckboxItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
          </DropdownMenuGroup>
        )}

        {Object.values(derivedHide).every(Boolean) && (
          <div className="px-3 py-2 text-muted-foreground text-xs">
            All filters added — use the + Filter chip.
          </div>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}

// Slider-based amount inline control implemented above
