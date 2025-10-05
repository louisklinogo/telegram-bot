import type { SupabaseClient } from "@supabase/supabase-js";

type UploadOptions = {
  bucket: string;
  path: string[];
  file: File;
  onProgress?: (bytesUploaded: number, bytesTotal: number) => void;
};

export async function resumableUpload(
  supabase: unknown,
  { bucket, path, file, onProgress }: UploadOptions,
) {
  const filename = `${Date.now()}-${file.name.replace(/[^a-zA-Z0-9.-]/g, "_")}`;
  const filePath = [...path, filename].join("/");

  // Upload file to Supabase Storage
  const { data, error } = await (supabase as any).storage
    .from(bucket)
    .upload(filePath, file, {
      cacheControl: "3600",
      upsert: false,
    });

  if (error) {
    throw new Error(`Upload failed: ${error.message}`);
  }

  // Simulate progress for now (Supabase SDK doesn't expose upload progress)
  onProgress?.(file.size, file.size);

  return {
    filename,
    file,
    path: data.path,
  };
}

export function formatFileSize(bytes?: number | null): string {
  if (!bytes || bytes === 0) return "0 Bytes";

  const k = 1024;
  const sizes = ["Bytes", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(k));

  return `${Math.round(bytes / Math.pow(k, i) * 100) / 100} ${sizes[i]}`;
}
