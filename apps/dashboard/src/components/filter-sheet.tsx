"use client";

import { Label } from "@Faworra/ui/label";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Sheet, SheetContent, SheetFooter, SheetHeader, SheetTitle } from "@/components/ui/sheet";

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
    <Sheet onOpenChange={onOpenChange} open={open}>
      <SheetContent>
        <SheetHeader>
          <SheetTitle>Filter Clients</SheetTitle>
        </SheetHeader>

        <div className="space-y-6 py-6">
          <div className="space-y-2">
            <Label>Referral Source</Label>
            <Select
              onValueChange={(value) => setFilters({ ...filters, referralSource: value })}
              value={filters.referralSource}
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
              onValueChange={(value) => setFilters({ ...filters, hasOrders: value === "true" })}
              value={filters.hasOrders?.toString()}
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
                <Label className="text-muted-foreground text-xs">Min</Label>
                <Input
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      minRevenue: Number(e.target.value) || undefined,
                    })
                  }
                  placeholder="0"
                  type="number"
                  value={filters.minRevenue || ""}
                />
              </div>
              <div className="space-y-2">
                <Label className="text-muted-foreground text-xs">Max</Label>
                <Input
                  onChange={(e) =>
                    setFilters({
                      ...filters,
                      maxRevenue: Number(e.target.value) || undefined,
                    })
                  }
                  placeholder="10000"
                  type="number"
                  value={filters.maxRevenue || ""}
                />
              </div>
            </div>
          </div>
        </div>

        <SheetFooter className="flex justify-end gap-4">
          <Button onClick={handleClear} variant="outline">
            Clear All
          </Button>
          <Button onClick={handleApply}>Apply Filters</Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
}
