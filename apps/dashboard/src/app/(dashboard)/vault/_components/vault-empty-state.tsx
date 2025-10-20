"use client";

import { Upload } from "lucide-react";
import { UploadDocumentDialog } from "./upload-document-dialog";

type VaultEmptyStateProps = {
  teamId: string;
};

export function VaultEmptyState({ teamId }: VaultEmptyStateProps) {
  return (
    <div className="h-[calc(100vh-250px)] flex items-center justify-center">
      <div className="relative z-20 m-auto flex w-full max-w-[380px] flex-col">
        <div className="flex w-full flex-col relative text-center">
          <div className="pb-4">
            <h2 className="font-medium text-lg">Always find what you need</h2>
          </div>

          <p className="pb-6 text-sm text-muted-foreground">
            Drag & drop or upload your documents. We'll automatically organize them with tags based
            on content, making them easy and secure to find.
          </p>

          <UploadDocumentDialog
            teamId={teamId}
            trigger={
              <button className="inline-flex items-center justify-center gap-2 rounded-md border border-input bg-background px-4 py-2 text-sm font-medium shadow-sm transition-colors hover:bg-accent hover:text-accent-foreground">
                <Upload className="h-4 w-4" />
                Upload Documents
              </button>
            }
          />
        </div>
      </div>
    </div>
  );
}
