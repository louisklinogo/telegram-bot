"use client";

import { createBrowserClient } from "@Faworra/supabase/client";
import { File, FolderOpen, Upload, X } from "lucide-react";
import { useState } from "react";
import { useDropzone } from "react-dropzone";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { trpc } from "@/lib/trpc/client";
import { resumableUpload } from "@/lib/upload";
import { cn } from "@/lib/utils";
import { DocumentRelationsSelector } from "./document-relations-selector";
import { FolderSelector } from "./folder-selector";

type UploadDocumentDialogProps = {
  teamId: string;
  trigger?: React.ReactNode;
};

export function UploadDocumentDialog({ teamId, trigger }: UploadDocumentDialogProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [folderPath, setFolderPath] = useState<string[]>([]);
  const [tags, setTags] = useState<string[]>([]);
  const [relations, setRelations] = useState<{
    orderId?: string;
    invoiceId?: string;
    clientId?: string;
  }>({});
  const [isUploading, setIsUploading] = useState(false);

  const supabase = createBrowserClient();
  const utils = trpc.useUtils();

  const createDocumentMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      utils.documents.list.invalidate();
    },
  });

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop: (files) => setSelectedFiles(files),
    maxSize: 5 * 1024 * 1024, // 5MB
    maxFiles: 25,
  });

  const removeFile = (index: number) => {
    setSelectedFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpload = async () => {
    if (selectedFiles.length === 0) return;

    setIsUploading(true);

    try {
      const basePath = [teamId, ...folderPath];

      // Upload files to Supabase Storage
      const uploadResults = await Promise.all(
        selectedFiles.map(async (file) => {
          const result = await resumableUpload(supabase, {
            bucket: "vault",
            path: basePath,
            file,
            onProgress: () => {}, // TODO: Add progress tracking
          });
          return { ...result, file };
        })
      );

      // Create document records
      await Promise.all(
        uploadResults.map((result) =>
          createDocumentMutation.mutateAsync({
            name: result.file.name,
            pathTokens: [...basePath, result.filename],
            mimeType: result.file.type,
            size: result.file.size,
            tags,
            orderId: relations.orderId,
            invoiceId: relations.invoiceId,
            clientId: relations.clientId,
          })
        )
      );

      toast.success(`${selectedFiles.length} file(s) uploaded successfully`);

      // Reset and close
      setSelectedFiles([]);
      setFolderPath([]);
      setTags([]);
      setRelations({});
      setIsOpen(false);
    } catch (error) {
      console.error("Upload error:", error);
      toast.error("Upload failed. Please try again.");
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <Sheet onOpenChange={setIsOpen} open={isOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button className="gap-2" size="sm" variant="outline">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" title="Upload Documents">
        <div className="flex h-full flex-col">
          <SheetHeader className="pb-6">
            <SheetTitle>Upload Documents</SheetTitle>
            <SheetDescription>Upload files and organize them in your vault</SheetDescription>
          </SheetHeader>

          <ScrollArea className="-mx-6 flex-1 px-6">
            <div className="space-y-6 pb-6">
              {/* File Drop Zone */}
              <div className="space-y-3">
                <div>
                  <p className="mb-2 font-medium text-sm">Files</p>
                  <div
                    {...getRootProps()}
                    className={cn(
                      "cursor-pointer rounded-lg border-2 border-dashed p-6 text-center transition-colors",
                      isDragActive
                        ? "border-primary bg-accent"
                        : "border-border hover:border-primary/50",
                      selectedFiles.length > 0 && "border-primary/30 bg-accent/50"
                    )}
                  >
                    <input {...getInputProps()} />
                    <Upload
                      className={cn(
                        "mx-auto mb-2 h-6 w-6",
                        selectedFiles.length > 0 ? "text-primary" : "text-muted-foreground"
                      )}
                    />
                    <p className="font-medium text-sm">
                      {isDragActive
                        ? "Drop files here..."
                        : selectedFiles.length > 0
                          ? "Add more files"
                          : "Click to browse or drag files"}
                    </p>
                    <p className="mt-1 text-muted-foreground text-xs">
                      Max 5MB per file, up to 25 files
                    </p>
                  </div>
                </div>

                {/* Selected Files List */}
                {selectedFiles.length > 0 && (
                  <div className="space-y-2">
                    <div className="flex items-center justify-between">
                      <p className="font-medium text-sm">{selectedFiles.length} file(s)</p>
                      <Button
                        className="h-auto p-0 text-muted-foreground text-xs hover:text-destructive"
                        onClick={() => setSelectedFiles([])}
                        size="sm"
                        variant="ghost"
                      >
                        Clear all
                      </Button>
                    </div>
                    <div className="space-y-1.5">
                      {selectedFiles.map((file, index) => (
                        <div
                          className="group flex items-center justify-between rounded-lg border p-2.5 transition-colors hover:bg-accent/50"
                          key={index}
                        >
                          <div className="flex min-w-0 flex-1 items-center gap-2.5">
                            <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm">{file.name}</p>
                              <p className="text-muted-foreground text-xs">
                                {(file.size / 1024).toFixed(1)} KB
                              </p>
                            </div>
                          </div>
                          <Button
                            className="h-auto p-1 opacity-0 group-hover:opacity-100"
                            onClick={() => removeFile(index)}
                            size="sm"
                            variant="ghost"
                          >
                            <X className="h-3.5 w-3.5" />
                          </Button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <Separator />

              {/* Organization */}
              <div className="space-y-4">
                <div className="flex items-center gap-2">
                  <FolderOpen className="h-4 w-4 text-muted-foreground" />
                  <p className="font-medium text-sm">Organization</p>
                </div>

                <FolderSelector onChange={setFolderPath} value={folderPath} />
              </div>

              <Separator />

              {/* Relations */}
              <div className="space-y-4">
                <p className="font-medium text-sm">Link to Records (Optional)</p>
                <DocumentRelationsSelector onChange={setRelations} value={relations} />
              </div>

              <Separator />

              {/* Tags */}
              <div className="space-y-2">
                <p className="font-medium text-sm">Tags (Optional)</p>
                <div className="flex gap-2">
                  <Input
                    onKeyDown={(e) => {
                      if (e.key === "Enter") {
                        e.preventDefault();
                        const value = e.currentTarget.value.trim().toLowerCase();
                        if (value && !tags.includes(value)) {
                          setTags([...tags, value]);
                          e.currentTarget.value = "";
                        }
                      }
                    }}
                    placeholder="Add tags (press Enter)..."
                  />
                </div>
                {tags.length > 0 && (
                  <div className="flex flex-wrap gap-1">
                    {tags.map((tag) => (
                      <Badge key={tag} variant="secondary">
                        {tag}
                        <button
                          className="ml-1 hover:text-destructive"
                          onClick={() => setTags(tags.filter((t) => t !== tag))}
                          type="button"
                        >
                          <X className="h-3 w-3" />
                        </button>
                      </Badge>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </ScrollArea>

          {/* Footer Actions */}
          <div className="-mx-6 border-t px-6 pt-6">
            <div className="flex gap-3">
              <Button
                className="flex-1"
                disabled={isUploading}
                onClick={() => setIsOpen(false)}
                variant="outline"
              >
                Cancel
              </Button>
              <Button
                className="flex-1"
                disabled={selectedFiles.length === 0 || isUploading}
                onClick={handleUpload}
              >
                {isUploading
                  ? "Uploading..."
                  : `Upload ${selectedFiles.length || ""} file${selectedFiles.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
