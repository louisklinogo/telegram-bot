"use client";

import { FolderCard } from "./folder-card";
import { VaultCard } from "./vault-card";

type VaultGridProps = {
  documents: any[];
  folders?: { name: string; count: number }[];
  onOpenFolder?: (name: string) => void;
};

export function VaultGrid({ documents, folders = [], onOpenFolder }: VaultGridProps) {
  return (
    <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4">
      {/* Folders first */}
      {folders.map((folder) => (
        <FolderCard
          count={folder.count}
          key={folder.name}
          name={folder.name}
          onClick={() => onOpenFolder?.(folder.name)}
        />
      ))}

      {/* Then files */}
      {documents.map((document) => (
        <VaultCard document={document} key={document.id} />
      ))}
    </div>
  );
}
