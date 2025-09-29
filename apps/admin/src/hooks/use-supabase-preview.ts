"use client";

import { useEffect, useState } from "react";

import { supabaseBrowser } from "@/lib/supabase-browser";

type PreviewOptions = {
  table: string;
  limit?: number;
};

export function useSupabasePreview<T = unknown>({ table, limit = 5 }: PreviewOptions) {
  const [data, setData] = useState<T[] | null>(null);
  const [loading, setLoading] = useState(Boolean(supabaseBrowser));
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchPreview() {
      if (!supabaseBrowser) return;
      try {
        const { data: rows, error: fetchError } = await supabaseBrowser
          .from(table)
          .select("*")
          .limit(limit);

        if (fetchError) {
          setError(fetchError.message);
          return;
        }

        setData(rows as T[]);
      } catch (err) {
        setError(err instanceof Error ? err.message : String(err));
      } finally {
        setLoading(false);
      }
    }

    fetchPreview();
  }, [table, limit]);

  return { data, loading, error };
}
