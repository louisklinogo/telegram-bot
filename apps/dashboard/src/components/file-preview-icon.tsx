"use client";

import { FileText, FolderArchive, File } from "lucide-react";
import { cn } from "@/lib/utils";

type Props = {
  mimeType?: string | null;
  className?: string;
};

export function FilePreviewIcon({ mimeType, className }: Props) {
  switch (mimeType) {
    case "application/pdf":
      return <FileText className={cn("w-full h-full text-red-500", className)} />;
    case "application/zip":
    case "application/x-zip-compressed":
      return <FolderArchive className={cn("w-full h-full text-amber-500", className)} />;
    default:
      return <File className={cn("w-full h-full text-muted-foreground", className)} />;
  }
}
