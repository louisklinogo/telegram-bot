"use client";

import { createBrowserClient } from "@cimantikos/supabase/client";
import { Button } from "@/components/ui/button";
import { Icons } from "@/components/ui/icons";
import { useSearchParams } from "next/navigation";
import { useState } from "react";

export function GoogleSignIn() {
  const [loading, setLoading] = useState(false);
  const supabase = createBrowserClient();
  const search = useSearchParams();
  const returnTo = search.get("return_to") || "";

  const onClick = async () => {
    setLoading(true);
    try {
      const redirect = new URL("/auth/callback", window.location.origin);
      if (returnTo) redirect.searchParams.append("return_to", returnTo);
      redirect.searchParams.append("provider", "google");
      await supabase.auth.signInWithOAuth({
        provider: "google",
        options: {
          redirectTo: redirect.toString(),
          queryParams: { prompt: "select_account" },
        },
      });
    } finally {
      // supabase will redirect; reset as fallback
      setTimeout(() => setLoading(false), 1500);
    }
  };

  return (
    <Button onClick={onClick} disabled={loading} className="w-full" variant="default">
      <div className="flex items-center gap-2">
        <Icons.Google />
        <span>{loading ? "Redirecting..." : "Continue with Google"}</span>
      </div>
    </Button>
  );
}
