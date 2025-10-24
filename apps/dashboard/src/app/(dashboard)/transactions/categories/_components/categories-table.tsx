"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { trpc } from "@/lib/trpc/client";
import { CategoryEditSheet } from "./category-edit-sheet";
import { CategoryCreateSheet } from "./category-create-sheet";

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
            <div className="hidden md:flex items-center gap-2 rounded-none border px-3 py-2 text-sm">
              <Icons.Search className="h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories…"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                className="h-6 w-[260px] border-none bg-transparent p-0 text-sm focus-visible:ring-0"
              />
            </div>
            <Button size="icon" onClick={() => setCreateOpen(true)} aria-label="Add category" title="Add category">
              <Icons.Add className="h-5 w-5" />
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {flat.length === 0 ? (
          <div className="py-16 text-center">
            <div className="text-sm text-muted-foreground mb-4">No categories yet</div>
            <Button onClick={() => setCreateOpen(true)}>Create</Button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Name</TableHead>
                    <TableHead className="w-[120px] sticky top-0 bg-background">Tax Type</TableHead>
                    <TableHead className="w-[100px] sticky top-0 bg-background">Tax Rate</TableHead>
                    <TableHead className="w-[160px] sticky top-0 bg-background">
                      Report Code
                    </TableHead>
                    <TableHead className="w-[120px] text-right sticky top-0 bg-background">
                      Actions
                    </TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id} onClick={() => setEditId(r.id)} className="cursor-pointer hover:bg-muted/50">
                      <TableCell>
                        <div
                          style={{ paddingLeft: `${r.depth * 16}px` }}
                          className="flex items-center gap-2 text-sm font-medium"
                        >
                          {r.hasChildren ? (
                            <button
                              className="p-1 -ml-1"
                              onClick={(e) => {
                                e.stopPropagation();
                                toggle(r.id);
                              }}
                              aria-label={expanded.has(r.id) ? "Collapse" : "Expand"}
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
                              <TooltipContent side="right" className="px-3 py-1.5 text-xs">
                                <span>{(r as any).description || "No description"}</span>
                              </TooltipContent>
                            </Tooltip>
                          </TooltipProvider>
                          {r.system ? (
                            <span className="border border-border rounded-full py-1 px-2 text-[10px] text-[#878787] font-mono">
                              System
                            </span>
                          ) : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTaxType(r.taxType)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {formatTaxRate(r.taxRate)}
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {r.taxReportingCode || "-"}
                      </TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => e.stopPropagation()}
                              aria-label="Actions"
                            >
                              <Icons.MoreHoriz className="size-5" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenuItem onClick={() => setEditId(r.id)}>Edit</DropdownMenuItem>
                            {!r.system && (
                              <DropdownMenuItem
                                onClick={async () => {
                                  if (window.confirm("Delete this category?")) {
                                    await del.mutateAsync({ id: r.id });
                                  }
                                }}
                                disabled={del.isPending}
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
        open={!!editId}
        onOpenChange={(o) => !o && setEditId(null)}
        id={editId}
        categories={initialCategories}
      />
      <CategoryCreateSheet
        open={createOpen}
        onOpenChange={setCreateOpen}
        categories={initialCategories}
        defaultTaxType={defaultTaxType}
      />
    </Card>
  );
}

function flatten(
  nodes: CategoryNode[],
  depth = 0,
  ancestors: string[] = [],
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
  const n = typeof r === "number" ? r : parseFloat(r);
  if (!isFinite(n)) return "-";
  return `${n}%`;
}
