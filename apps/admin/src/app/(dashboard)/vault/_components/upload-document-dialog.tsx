"use client";

import { useState } from "react";
import { Upload, X, File, FolderOpen } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import { useDropzone } from "react-dropzone";
import { cn } from "@/lib/utils";
import { FolderSelector } from "./folder-selector";
import { DocumentRelationsSelector } from "./document-relations-selector";
import { createBrowserClient } from "@cimantikos/supabase/client";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";
import { resumableUpload } from "@/lib/upload";
import { trpc } from "@/lib/trpc/client";
import { toast } from "sonner";

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
        }),
      );

      // Create document records
      await Promise.all(
        uploadResults.map((result) =>
          createDocumentMutation.mutateAsync({
            name: result.file.name,
            pathTokens: [...basePath, result.filename],
            mimeType: result.file.type,
            size: result.file.size,
            tags: tags,
            orderId: relations.orderId,
            invoiceId: relations.invoiceId,
            clientId: relations.clientId,
          }),
        ),
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
    <Sheet open={isOpen} onOpenChange={setIsOpen}>
      <SheetTrigger asChild>
        {trigger || (
          <Button variant="outline" size="sm" className="gap-2">
            <Upload className="h-4 w-4" />
            Upload
          </Button>
        )}
      </SheetTrigger>

      <SheetContent side="right" title="Upload Documents">
        <div className="flex flex-col h-full">
          <SheetHeader className="pb-6">
            <SheetTitle>Upload Documents</SheetTitle>
            <SheetDescription>
              Upload files and organize them in your vault
            </SheetDescription>
          </SheetHeader>

          <ScrollArea className="flex-1 -mx-6 px-6">
            <div className="space-y-6 pb-6">
          {/* File Drop Zone */}
          <div className="space-y-3">
            <div>
              <p className="text-sm font-medium mb-2">Files</p>
              <div
                {...getRootProps()}
                className={cn(
                  "border-2 border-dashed rounded-lg p-6 text-center cursor-pointer transition-colors",
                  isDragActive ? "border-primary bg-accent" : "border-border hover:border-primary/50",
                  selectedFiles.length > 0 && "border-primary/30 bg-accent/50"
                )}
              >
                <input {...getInputProps()} />
                <Upload className={cn(
                  "h-6 w-6 mx-auto mb-2",
                  selectedFiles.length > 0 ? "text-primary" : "text-muted-foreground"
                )} />
                <p className="text-sm font-medium">
                  {isDragActive 
                    ? "Drop files here..." 
                    : selectedFiles.length > 0 
                    ? "Add more files" 
                    : "Click to browse or drag files"}
                </p>
                <p className="text-xs text-muted-foreground mt-1">
                  Max 5MB per file, up to 25 files
                </p>
              </div>
            </div>

            {/* Selected Files List */}
            {selectedFiles.length > 0 && (
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <p className="text-sm font-medium">{selectedFiles.length} file(s)</p>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setSelectedFiles([])}
                    className="h-auto p-0 text-xs text-muted-foreground hover:text-destructive"
                  >
                    Clear all
                  </Button>
                </div>
                <div className="space-y-1.5">
                  {selectedFiles.map((file, index) => (
                    <div
                      key={index}
                      className="flex items-center justify-between p-2.5 border rounded-lg hover:bg-accent/50 transition-colors group"
                    >
                      <div className="flex items-center gap-2.5 flex-1 min-w-0">
                        <File className="h-4 w-4 flex-shrink-0 text-muted-foreground" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm truncate">{file.name}</p>
                          <p className="text-xs text-muted-foreground">
                            {(file.size / 1024).toFixed(1)} KB
                          </p>
                        </div>
                      </div>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFile(index)}
                        className="opacity-0 group-hover:opacity-100 h-auto p-1"
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
              <p className="text-sm font-medium">Organization</p>
            </div>
            
            <FolderSelector value={folderPath} onChange={setFolderPath} />
          </div>

          <Separator />

          {/* Relations */}
          <div className="space-y-4">
            <p className="text-sm font-medium">Link to Records (Optional)</p>
            <DocumentRelationsSelector value={relations} onChange={setRelations} />
          </div>

          <Separator />

          {/* Tags */}
          <div className="space-y-2">
            <p className="text-sm font-medium">Tags (Optional)</p>
            <div className="flex gap-2">
              <Input
                placeholder="Add tags (press Enter)..."
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
              />
            </div>
            {tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {tags.map((tag) => (
                  <Badge key={tag} variant="secondary">
                    {tag}
                    <button
                      type="button"
                      onClick={() => setTags(tags.filter((t) => t !== tag))}
                      className="ml-1 hover:text-destructive"
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
          <div className="pt-6 -mx-6 px-6 border-t">
            <div className="flex gap-3">
              <Button 
                variant="outline" 
                onClick={() => setIsOpen(false)} 
                disabled={isUploading}
                className="flex-1"
              >
                Cancel
              </Button>
              <Button
                onClick={handleUpload}
                disabled={selectedFiles.length === 0 || isUploading}
                className="flex-1"
              >
                {isUploading ? "Uploading..." : `Upload ${selectedFiles.length || ""} file${selectedFiles.length !== 1 ? "s" : ""}`}
              </Button>
            </div>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
}
