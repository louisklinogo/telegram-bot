"use client";

import { useDropzone } from "react-dropzone";

export function DropzoneUpload({ onDrop }: { onDrop: (files: File[]) => Promise<void> | void }) {
  const { getRootProps, getInputProps, isDragActive, open } = useDropzone({
    onDrop: (files) => void onDrop(files),
    maxFiles: 25,
    maxSize: 10 * 1024 * 1024,
    noClick: true,
    multiple: true,
  });
  return (
    <div className="space-y-2">
      <div
        {...getRootProps()}
        className={`border border-dashed rounded-md px-4 text-sm min-h-[120px] flex items-center justify-center text-center ${isDragActive ? "bg-secondary" : "bg-background"}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground">
          Drop your files here, or{" "}
          <button type="button" onClick={open} className="underline">
            click to browse
          </button>
          .
          <br />
          10MB file limit.
        </p>
      </div>
    </div>
  );
}
