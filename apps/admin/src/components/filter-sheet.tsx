"use client";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@cimantikos/ui/label";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useState } from "react";

type FilterSheetProps = {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onApplyFilters: (filters: FilterOptions) => void;
};

export type FilterOptions = {
  referralSource?: string;
  country?: string;
  hasOrders?: boolean;
  minRevenue?: number;
  maxRevenue?: number;
  tags?: string[];
};

export function FilterSheet({ open, onOpenChange, onApplyFilters }: FilterSheetProps) {
  const [filters, setFilters] = useState<FilterOptions>({});

  const handleApply = () => {
    onApplyFilters(filters);
    onOpenChange(false);
  };

  const handleClear = () => {
    setFilters({});
    onApplyFilters({});
    onOpenChange(false);
  };

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Clients</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Referral Source</Label>
            <Select
              value={filters.referralSource}
              onValueChange={(value) =>
                setFilters({ ...filters, referralSource: value })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Select source..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="instagram">Instagram</SelectItem>
                <SelectItem value="facebook">Facebook</SelectItem>
                <SelectItem value="word-of-mouth">Word of Mouth</SelectItem>
                <SelectItem value="google">Google</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-2">
            <Label>Has Orders</Label>
            <Select
              value={filters.hasOrders?.toString()}
              onValueChange={(value) =>
                setFilters({ ...filters, hasOrders: value === "true" })
              }
            >
              <SelectTrigger>
                <SelectValue placeholder="Any" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="true">Yes</SelectItem>
                <SelectItem value="false">No</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-4">
            <Label>Revenue Range (GHS)</Label>
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Min</Label>
                <Input
                  type="number"
                  placeholder="0"
                  value={filters.minRevenue || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minRevenue: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
              <div className="space-y-2">
                <Label className="text-xs text-muted-foreground">Max</Label>
                <Input
                  type="number"
                  placeholder="10000"
                  value={filters.maxRevenue || ""}
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxRevenue: Number(e.target.value) || undefined,
                    })
                  }
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex gap-2">
          <Button variant="outline" onClick={handleClear}>
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
