"use client";

import { File, FileText, FolderArchive } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  mimeType?: string | null;
  className?: string;
};

export function FilePreviewIcon({ mimeType, className }: Props) {
  switch (mimeType) {
    case "application/pdf":
      return <FileText className={cn("h-full w-full text-red-500", className)} />;
    case "application/zip":
    case "application/x-zip-compressed":
      return <FolderArchive className={cn("h-full w-full text-amber-500", className)} />;
    default:
      return <File className={cn("h-full w-full text-muted-foreground", className)} />;
  }
}
