"use client";

import { ChevronRight, Folder, Home } from "lucide-react";
import { Button } from "@/components/ui/button";

type VaultBreadcrumbProps = {
  path: string[];
  onNavigate: (path: string[]) => void;
};

export function VaultBreadcrumb({ path, onNavigate }: VaultBreadcrumbProps) {
  return (
    <div className="flex items-center gap-1 text-muted-foreground text-sm">
      <Button className="h-7 gap-1 px-2" onClick={() => onNavigate([])} size="sm" variant="ghost">
        <Home className="h-3.5 w-3.5" />
        <span>Vault</span>
      </Button>

      {path.map((folder, index) => (
        <div className="flex items-center gap-1" key={index}>
          <ChevronRight className="h-3.5 w-3.5" />
          <Button
            className="h-7 gap-1 px-2"
            onClick={() => onNavigate(path.slice(0, index + 1))}
            size="sm"
            variant="ghost"
          >
            <Folder className="h-3.5 w-3.5" />
            <span>{folder}</span>
          </Button>
        </div>
      ))}
    </div>
  );
}
