"use client";

import { Folder } from "lucide-react";

type FolderCardProps = {
  name: string;
  count: number;
  onClick: () => void;
};

export function FolderCard({ name, count, onClick }: FolderCardProps) {
  return (
    <div
      className="group relative flex h-72 cursor-pointer flex-col gap-3 border p-4 text-muted-foreground transition-colors duration-200 hover:bg-accent"
      onClick={onClick}
    >
      <div className="flex h-[84px] w-[60px] items-center justify-center bg-accent">
        <Folder className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="flex flex-col text-left">
        <h2 className="mb-1 font-medium text-primary text-sm">{name}</h2>
        <p className="text-muted-foreground text-xs">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}
