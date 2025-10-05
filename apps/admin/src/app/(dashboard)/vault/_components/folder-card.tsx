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
      className="h-72 border relative flex text-muted-foreground p-4 flex-col gap-3 hover:bg-accent cursor-pointer transition-colors duration-200 group"
      onClick={onClick}
    >
      <div className="w-[60px] h-[84px] flex items-center justify-center bg-accent">
        <Folder className="h-12 w-12 text-muted-foreground" />
      </div>

      <div className="flex flex-col text-left">
        <h2 className="text-sm text-primary font-medium mb-1">{name}</h2>
        <p className="text-xs text-muted-foreground">
          {count} {count === 1 ? "item" : "items"}
        </p>
      </div>
    </div>
  );
}
