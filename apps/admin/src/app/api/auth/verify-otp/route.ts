import { createServerClient } from "@cimantikos/supabase/server";
import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";
import { cookies } from "next/headers";
import { CookiePreferredSignInProvider } from "@/lib/cookies";

export async function POST(req: NextRequest) {
  const form = await req.formData();
  const email = String(form.get("email") || "");
  const token = String(form.get("token") || "");
  const returnTo = String(form.get("return_to") || "");
  const supabase = await createServerClient();

  if (!email || !token) {
    return NextResponse.json({ error: "email and token required" }, { status: 400 });
  }

  const { error } = await supabase.auth.verifyOtp({ email, token, type: "email" });
  if (error) {
    return NextResponse.redirect(new URL(`/login?error=otp_failed&reason=${encodeURIComponent(error.message)}`, req.url));
  }

  // After verification, mirror callback logic: route to teams if needed
  const {
    data: { session },
  } = await supabase.auth.getSession();
  const url = new URL(req.url);
  if (!session) {
    return NextResponse.redirect(new URL(`/login?error=no_session`, url.origin));
  }

  // Remember provider preference
  (await cookies()).set(CookiePreferredSignInProvider, "otp", { maxAge: 60 * 60 * 24 * 365 });

  const userId = session.user.id;
  try {
    const { count } = await supabase
      .from("users_on_team")
      .select("*", { count: "exact", head: true })
      .eq("user_id", userId);
    if ((count || 0) === 0) {
      return NextResponse.redirect(new URL("/teams/create", url.origin));
    }
    const { data: profile } = await supabase
      .from("users")
      .select("current_team_id")
      .eq("id", userId)
      .maybeSingle<{ current_team_id: string | null }>();
    if (!profile?.current_team_id) {
      return NextResponse.redirect(new URL("/teams", url.origin));
    }
  } catch {}

  if (returnTo) {
    return NextResponse.redirect(new URL(`/${returnTo}`, url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
