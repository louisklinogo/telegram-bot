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
        className={`flex min-h-[120px] items-center justify-center rounded-md border border-dashed px-4 text-center text-sm ${isDragActive ? "bg-secondary" : "bg-background"}`}
      >
        <input {...getInputProps()} />
        <p className="text-muted-foreground">
          Drop your files here, or{" "}
          <button className="underline" onClick={open} type="button">
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
