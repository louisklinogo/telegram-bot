"use client";

import { useEffect, useState } from "react";
import { createBrowserClient } from "@cimantikos/supabase/client";

export function useAuthReady() {
  const supabase = createBrowserClient();
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let mounted = true;
    supabase.auth.getSession().then(({ data }) => {
      if (mounted) setReady(!!data.session?.access_token);
    });
    const { data: sub } = supabase.auth.onAuthStateChange((_e, session) => {
      if (mounted) setReady(!!session?.access_token);
    });
    return () => {
      mounted = false;
      sub?.subscription.unsubscribe();
    };
  }, []);

  return ready;
}
