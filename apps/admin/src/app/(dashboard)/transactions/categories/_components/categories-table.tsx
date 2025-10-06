"use client";

import { useMemo, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Icons } from "@/components/ui/icons";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { trpc } from "@/lib/trpc/client";
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
};

export function CategoriesTable({ initialCategories }: Props) {
  const flat = useMemo(() => flatten(initialCategories), [initialCategories]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());
  const [editId, setEditId] = useState<string | null>(null);
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

  const visible = flat.filter((r) => r.ancestors.every((a) => expanded.has(a)) || r.depth === 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base">Categories</CardTitle>
      </CardHeader>
      <CardContent>
        {flat.length === 0 ? (
          <div className="text-sm text-muted-foreground">No categories yet.</div>
        ) : (
          <div className="overflow-x-auto">
            <div className="max-h-[60vh] overflow-y-auto">
              <Table>
                <TableHeader className="sticky top-0 z-10 bg-background">
                  <TableRow>
                    <TableHead className="sticky top-0 bg-background">Name</TableHead>
                    <TableHead className="w-[120px] sticky top-0 bg-background">Tax Type</TableHead>
                    <TableHead className="w-[100px] sticky top-0 bg-background">Tax Rate</TableHead>
                    <TableHead className="w-[160px] sticky top-0 bg-background">Report Code</TableHead>
                    <TableHead className="w-[120px] text-right sticky top-0 bg-background">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {visible.map((r) => (
                    <TableRow key={r.id}>
                      <TableCell>
                        <div style={{ paddingLeft: `${r.depth * 16}px` }} className="flex items-center gap-2 text-sm font-medium">
                          {r.hasChildren ? (
                            <button className="p-1 -ml-1" onClick={() => toggle(r.id)} aria-label={expanded.has(r.id) ? "Collapse" : "Expand"}>
                              {expanded.has(r.id) ? <Icons.ChevronDown size={18} /> : <Icons.ChevronRight size={18} />}
                            </button>
                          ) : (
                            <span className="inline-block w-[18px]" />
                          )}
                          <span
                            className="inline-block h-3 w-3 rounded-sm border"
                            style={{ backgroundColor: (r.color as any) || "transparent" }}
                            title={(r.color as any) || undefined}
                          />
                          <span>{r.name}</span>
                          {r.system ? <Badge variant="tag">SYSTEM</Badge> : null}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.taxType || "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.taxRate ?? "-"}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">{r.taxReportingCode || "-"}</TableCell>
                      <TableCell className="text-right">
                        <div className="flex justify-end gap-2">
                          <Button size="icon" variant="ghost" onClick={() => setEditId(r.id)} title="Edit">
                            <Icons.Edit className="size-5" />
                          </Button>
                          <Button
                            size="icon"
                            variant="ghost"
                            onClick={async () => {
                              if (window.confirm("Delete this category?")) {
                                await del.mutateAsync({ id: r.id });
                              }
                            }}
                            title="Delete"
                            disabled={Boolean(r.system) || del.isPending}
                          >
                            <Icons.Delete className="size-5" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          </div>
        )}
      </CardContent>
      <CategoryEditSheet open={!!editId} onOpenChange={(o) => !o && setEditId(null)} id={editId} categories={initialCategories} />
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
  const out: Array<
    CategoryNode & { depth: number; hasChildren: boolean; ancestors: string[] }
  > = [];
  for (const n of nodes) {
    const children = n.children || [];
    out.push({ ...n, depth, hasChildren: children.length > 0, ancestors });
    if (children.length > 0) {
      out.push(...flatten(children, depth + 1, [...ancestors, n.id]));
    }
  }
  return out;
}
