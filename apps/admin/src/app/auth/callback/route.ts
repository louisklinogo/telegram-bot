import { createServerClient } from "@cimantikos/supabase/server";
import { upsertUserBasic } from "@cimantikos/supabase/mutations";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";
import { cookies } from "next/headers";
import { CookiePreferredSignInProvider } from "@/lib/cookies";

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url);
  const code = requestUrl.searchParams.get("code");
  const provider = requestUrl.searchParams.get("provider");

  if (code) {
    const supabase = await createServerClient();

    // Exchange the code for a session
    const { error } = await supabase.auth.exchangeCodeForSession(code);

    if (error) {
      const status = (error as any)?.status || "unknown";
      const reason = encodeURIComponent((error as any)?.message || "unknown_error");
      console.error("Auth callback error:", { status, message: (error as any)?.message });
      return NextResponse.redirect(
        new URL(`/login?error=auth_failed&status=${status}&reason=${reason}`, requestUrl.origin),
      );
    }

    // Check if user has a team
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user) {
      // Ensure user row exists (bootstrap)
      try {
        const admin = await createServerClient({ admin: true });
        await upsertUserBasic(admin, { id: user.id, email: user.email });
      } catch {}

      try {
        // 1) If user has zero teams -> create flow
        const { count } = await supabase
          .from("users_on_team")
          .select("*", { count: "exact", head: true })
          .eq("user_id", user.id);

        if ((count || 0) === 0) {
          return NextResponse.redirect(new URL("/teams/create", requestUrl.origin));
        }

        // 2) If user has teams but no current selection -> teams selector
        const { data: profile } = await supabase
          .from("users")
          .select("current_team_id")
          .eq("id", user.id)
          .maybeSingle<{ current_team_id: string | null }>();

        if (!profile?.current_team_id) {
          return NextResponse.redirect(new URL("/teams", requestUrl.origin));
        }
      } catch (error) {
        console.error("Error checking team state:", error);
        return NextResponse.redirect(new URL("/teams/create", requestUrl.origin));
      }
    }
  }

  // Remember provider preference from OAuth
  if (provider) {
    (await cookies()).set(CookiePreferredSignInProvider, provider, { maxAge: 60 * 60 * 24 * 365 });
  }

  // Redirect to dashboard after successful auth
  return NextResponse.redirect(new URL("/", requestUrl.origin));
}
