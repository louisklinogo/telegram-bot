"use client";

import { type ReactNode, useEffect, useRef, useState } from "react";
import { type FileRejection, useDropzone } from "react-dropzone";
import { createBrowserClient } from "@cimantikos/supabase/client";
import { resumableUpload } from "@/lib/upload";
import { trpc } from "@/lib/trpc/client";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";

type UploadResult = {
  filename: string;
  file: File;
  path: string;
};

type Props = {
  children: ReactNode;
  teamId: string;
};

export function VaultUploadZone({ children, teamId }: Props) {
  const supabase = createBrowserClient();
  const { toast } = useToast();
  const utils = trpc.useUtils();
  const [progress, setProgress] = useState(0);
  const [isUploading, setIsUploading] = useState(false);
  const uploadProgress = useRef<number[]>([]);

  const createDocumentMutation = trpc.documents.create.useMutation({
    onSuccess: () => {
      // Invalidate and refetch documents list
      utils.documents.list.invalidate();
    },
  });

  const onDrop = async (files: File[]) => {
    if (!files.length) return;

    // Initialize progress tracking
    uploadProgress.current = files.map(() => 0);
    setIsUploading(true);
    setProgress(0);

    const path = [teamId];

    toast({
      title: `Uploading ${files.length} file${files.length > 1 ? "s" : ""}...`,
      description: "Please do not close the browser until completed",
    });

    try {
      // Upload all files
      const results = (await Promise.all(
        files.map(async (file: File, idx: number) =>
          resumableUpload(supabase, {
            bucket: "vault",
            path,
            file,
            onProgress: (bytesUploaded: number, bytesTotal: number) => {
              uploadProgress.current[idx] = (bytesUploaded / bytesTotal) * 100;

              const totalProgress = uploadProgress.current.reduce(
                (acc, val) => acc + val,
                0,
              );

              setProgress(Math.round(totalProgress / files.length));
            },
          }),
        ),
      )) as UploadResult[];

      // Create document records in database
      await Promise.all(
        results.map((result) =>
          createDocumentMutation.mutateAsync({
            name: result.file.name,
            pathTokens: [...path, result.filename],
            mimeType: result.file.type,
            size: result.file.size,
            tags: [],
          }),
        ),
      );

      toast({
        title: "Upload successful",
        description: `${files.length} file${files.length > 1 ? "s" : ""} uploaded`,
      });
    } catch (error) {
      console.error("Upload error:", error);
      toast({
        title: "Upload failed",
        description: error instanceof Error ? error.message : "Something went wrong",
        variant: "destructive",
      });
    } finally {
      setIsUploading(false);
      setProgress(0);
      uploadProgress.current = [];
    }
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    onDropRejected: ([reject]: FileRejection[]) => {
      if (reject?.errors.find(({ code }) => code === "file-too-large")) {
        toast({
          title: "File too large",
          description: "Maximum file size is 5MB",
          variant: "destructive",
        });
      }

      if (reject?.errors.find(({ code }) => code === "file-invalid-type")) {
        toast({
          title: "Invalid file type",
          description: "File type not supported",
          variant: "destructive",
        });
      }
    },
    maxSize: 5242880, // 5MB
    maxFiles: 25,
    accept: {
      "image/*": [".jpg", ".jpeg", ".png", ".webp", ".heic", ".heif", ".avif"],
      "application/pdf": [".pdf"],
      "application/msword": [".doc"],
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document": [".docx"],
      "application/vnd.oasis.opendocument.text": [".odt"],
      "application/vnd.ms-excel": [".xls"],
      "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet": [".xlsx"],
      "application/vnd.oasis.opendocument.spreadsheet": [".ods"],
      "application/vnd.ms-powerpoint": [".ppt"],
      "application/vnd.openxmlformats-officedocument.presentationml.presentation": [".pptx"],
      "application/vnd.oasis.opendocument.presentation": [".odp"],
      "text/plain": [".txt"],
      "text/csv": [".csv"],
      "text/markdown": [".md"],
      "application/rtf": [".rtf"],
      "application/zip": [".zip"],
    },
    disabled: isUploading,
  });

  return (
    <div
      className="relative h-full"
      {...getRootProps({ onClick: (evt) => evt.stopPropagation() })}
    >
      {/* Drag overlay */}
      <div className="absolute top-0 right-0 left-0 z-50 w-full pointer-events-none h-[calc(100vh-150px)]">
        <div
          className={cn(
            "bg-background/95 backdrop-blur-sm h-full w-full flex items-center justify-center text-center border-2 border-dashed border-primary/50 rounded-lg transition-all",
            isDragActive ? "visible opacity-100" : "invisible opacity-0",
          )}
        >
          <input {...getInputProps()} id="upload-files" />

          <div className="flex flex-col items-center justify-center gap-2">
            <p className="text-sm font-medium">
              Drop your documents and files here
            </p>
            <span className="text-xs text-muted-foreground">
              Maximum of 25 files at a time • Max file size 5MB
            </span>
          </div>
        </div>
      </div>

      {/* Upload progress */}
      {isUploading && (
        <div className="absolute top-4 right-4 z-50 bg-background border rounded-lg p-4 shadow-lg min-w-[200px]">
          <div className="space-y-2">
            <p className="text-sm font-medium">Uploading...</p>
            <div className="w-full bg-secondary rounded-full h-2">
              <div
                className="bg-primary h-2 rounded-full transition-all"
                style={{ width: `${progress}%` }}
              />
            </div>
            <p className="text-xs text-muted-foreground">{progress}%</p>
          </div>
        </div>
      )}

      {children}
    </div>
  );
}
