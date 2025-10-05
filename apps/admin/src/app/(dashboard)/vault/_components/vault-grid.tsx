"use client";

import { VaultCard } from "./vault-card";
import { FolderCard } from "./folder-card";

type VaultGridProps = {
  documents: any[];
  folders?: { name: string; count: number }[];
  onOpenFolder?: (name: string) => void;
};

export function VaultGrid({ documents, folders = [], onOpenFolder }: VaultGridProps) {
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
      {/* Folders first */}
      {folders.map((folder) => (
        <FolderCard
          key={folder.name}
          name={folder.name}
          count={folder.count}
          onClick={() => onOpenFolder?.(folder.name)}
        />
      ))}
      
      {/* Then files */}
      {documents.map((document) => (
        <VaultCard key={document.id} document={document} />
      ))}
    </div>
  );
}
