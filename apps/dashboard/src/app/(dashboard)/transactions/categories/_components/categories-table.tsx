"use client";

import { useMemo, useState } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Icons } from "@/components/ui/icons";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";
import { CategoryCreateSheet } from "./category-create-sheet";
import { CategoryEditSheet } from "./category-edit-sheet";

type CategoryNode = {
  id: string;
  name: string;
  color: string | null;
  parentId: string | null;
  system?: boolean | null;
  taxType?: string | null;
  taxRate?: string | number | null;
  taxReportingCode?: string | null;
  children?: CategoryNode[];
};

type Props = {
  initialCategories: CategoryNode[];
  defaultTaxType?: string;
};

export function CategoriesTable({ initialCategories, defaultTaxType = "" }: Props) {
  const flat = useMemo(() => flatten(initialCategories), [initialCategories]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [query, setQuery] = useState("");
  const [editId, setEditId] = useState<string | null>(null);
  const [createOpen, setCreateOpen] = useState(false);
  const utils = trpc.useUtils();
  const del = trpc.transactionCategories.delete.useMutation({
    onSuccess: async () => {
      await utils.transactionCategories.list.invalidate();
    },
  });

  const toggle = (id: string) => {
    setExpanded((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  // Filtering logic (case-insensitive). When searching, include matching rows and their ancestors.
  const visible = useMemo(() => {
    if (!query.trim()) {
      return flat.filter((r) => r.ancestors.every((a) => expanded.has(a)) || r.depth === 0);
    }
    const q = query.toLowerCase();
    const matchIds = new Set<string>();
    for (const r of flat) {
      if ((r.name || "").toLowerCase().includes(q)) matchIds.add(r.id);
    }
    const ancestorIds = new Set<string>();
    for (const r of flat) {
      if (matchIds.has(r.id)) for (const a of r.ancestors) ancestorIds.add(a);
    }
    return flat.filter((r) => matchIds.has(r.id) || ancestorIds.has(r.id));
  }, [flat, expanded, query]);

  return (
    <Card className="border-0">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between gap-3">
          <div className="sr-only">Categories</div>
          <div className="ml-auto flex items-center gap-2">
            <div className="hidden items-center gap-2 rounded-none border px-3 py-2 text-sm md:flex">
              <Icons.Search className="h-4 w-4 text-muted-foreground" />
              <Input
                className="h-6 w-[260px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search categories…"
                value={query}
              />
            </div>
            <Button
              aria-label="Add category"
              onClick={() => setCreateOpen(true)}
              size="icon"
              title="Add category"
            >
              <Icons.Add className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {flat.length === 0 ? (
          <div className="py-16 text-center">
            <div className="mb-4 text-muted-foreground text-sm">No categories yet</div>
            <Button onClick={() => setCreateOpen(true)}>Create</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Name</TableHead>
                    <TableHead className="sticky top-0 w-[120px] bg-background">Tax Type</TableHead>
                    <TableHead className="sticky top-0 w-[100px] bg-background">Tax Rate</TableHead>
                    <TableHead className="sticky top-0 w-[160px] bg-background">
                      Report Code
                    </TableHead>
                    <TableHead className="sticky top-0 w-[120px] bg-background text-right">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow
                      className="cursor-pointer hover:bg-muted/50"
                      key={r.id}
                      onClick={() => setEditId(r.id)}
                    >
                      <TableCell>
                        <div
                          className="flex items-center gap-2 font-medium text-sm"
                          style={{ paddingLeft: `${r.depth * 16}px` }}
                        >
                          {r.hasChildren ? (
                            <button
                              aria-label={expanded.has(r.id) ? "Collapse" : "Expand"}
                              className="-ml-1 p-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle(r.id);
                              }}
                            >
                              {expanded.has(r.id) ? (
                                <Icons.ChevronDown size={18} />
                              ) : (
                                <Icons.ChevronRight size={18} />
                              )}
                            </button>
                          ) : (
                            <span className="inline-block w-[18px]" />
                          )}
                          <span
                            className="inline-block h-3 w-3 rounded-sm border"
                            style={{ backgroundColor: (r.color as any) || "transparent" }}
                            title={(r.color as any) || undefined}
                          />
                          <TooltipProvider delayDuration={0}>
                            <Tooltip>
                              <TooltipTrigger asChild>
                                <span>{r.name}</span>
                              </TooltipTrigger>
                              <TooltipContent className="px-3 py-1.5 text-xs" side="right">
                                <span>{(r as any).description || "No description"}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {r.system ? (
                            <span className="rounded-full border border-border px-2 py-1 font-mono text-[#878787] text-[10px]">
                              System
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTaxType(r.taxType)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {formatTaxRate(r.taxRate)}
                      </TableCell>
                      <TableCell className="text-muted-foreground text-sm">
                        {r.taxReportingCode || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              aria-label="Actions"
                              onClick={(e) => e.stopPropagation()}
                              size="icon"
                              variant="ghost"
                            >
                              <Icons.MoreHoriz className="size-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setEditId(r.id)}>
                              Edit
                            </DropdownMenuItem>
                            {!r.system && (
                              <DropdownMenuItem
                                disabled={del.isPending}
                                onClick={async () => {
                                  if (window.confirm("Delete this category?")) {
                                    await del.mutateAsync({ id: r.id });
                                  }
                                }}
                              >
                                Remove
                              </DropdownMenuItem>
                            )}
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      <CategoryEditSheet
        categories={initialCategories}
        id={editId}
        onOpenChange={(o) => !o && setEditId(null)}
        open={!!editId}
      />
      <CategoryCreateSheet
        categories={initialCategories}
        defaultTaxType={defaultTaxType}
        onOpenChange={setCreateOpen}
        open={createOpen}
      />
    </Card>
  );
}

function flatten(
  nodes: CategoryNode[],
  depth = 0,
  ancestors: string[] = []
): Array<
  CategoryNode & {
    depth: number;
    hasChildren: boolean;
    ancestors: string[];
  }
> {
  const out: Array<CategoryNode & { depth: number; hasChildren: boolean; ancestors: string[] }> =
    [];
  for (const n of nodes) {
    const children = n.children || [];
    out.push({ ...n, depth, hasChildren: children.length > 0, ancestors });
    if (children.length > 0) {
      out.push(...flatten(children, depth + 1, [...ancestors, n.id]));
    }
  }
  return out;
}

function formatTaxType(t: string | null | undefined) {
  if (!t) return "-";
  const map: Record<string, string> = { vat: "VAT", gst: "GST", sales_tax: "Sales Tax" };
  return map[t] || t;
}

function formatTaxRate(r: string | number | null | undefined) {
  if (r === null || r === undefined || r === "") return "-";
  const n = typeof r === "number" ? r : Number.parseFloat(r);
  if (!isFinite(n)) return "-";
  return `${n}%`;
}
