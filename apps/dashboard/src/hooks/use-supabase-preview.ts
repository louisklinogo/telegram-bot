"use client";

// Deprecated hook: direct Supabase reads in client have been removed.
// Keeping a no-op to avoid runtime errors if accidentally imported.
export function useSupabasePreview<T = unknown>() {
  return { data: null as T[] | null, loading: false, error: "useSupabasePreview is deprecated" };
}
