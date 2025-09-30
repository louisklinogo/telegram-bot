"use client";

import { Filter, Search, Upload } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";

export function VaultHeader() {
  return (
    <div className="flex justify-between py-6">
      <div className="flex space-x-4 items-center">
        <form className="relative" onSubmit={(e) => e.preventDefault()}>
          <Search className="absolute pointer-events-none left-3 top-[11px] h-4 w-4" />
          <Input
            placeholder="Search or type filter"
            className="pl-9 w-full md:w-[350px] pr-8"
            autoComplete="off"
            autoCapitalize="none"
            autoCorrect="off"
            spellCheck="false"
          />
          <button
            type="button"
            className="absolute z-10 right-3 top-[10px] opacity-50 transition-opacity duration-300 hover:opacity-100"
          >
            <Filter className="h-4 w-4" />
          </button>
        </form>
      </div>
      
      <div className="space-x-2 hidden md:flex">
        <Button variant="outline" size="sm" className="gap-2">
          <Upload className="h-4 w-4" /> Upload
        </Button>
      </div>
    </div>
  );
}
