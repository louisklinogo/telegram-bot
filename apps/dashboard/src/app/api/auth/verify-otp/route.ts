import { createServerClient } from "@Faworra/supabase/server";
import { upsertUserBasic } from "@Faworra/supabase/mutations";
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
    return NextResponse.redirect(
      new URL(`/login?error=otp_failed&reason=${encodeURIComponent(error.message)}`, req.url),
    );
  }

  // After verification, use getUser() (server-verified) instead of getSession()
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const url = new URL(req.url);
  if (!user) {
    return NextResponse.redirect(new URL(`/login?error=no_user_after_otp`, url.origin));
  }

  // Remember provider preference
  (await cookies()).set(CookiePreferredSignInProvider, "otp", { maxAge: 60 * 60 * 24 * 365 });

  // Ensure user row exists in database (use admin key to bypass RLS)
  const admin = await createServerClient({ admin: true });
  const { error: upsertError } = await upsertUserBasic(admin, { id: user.id, email: user.email });
  if (upsertError) {
    console.error("[OTP] User upsert failed:", upsertError);
    return NextResponse.redirect(
      new URL(
        `/login?error=user_creation_failed&reason=${encodeURIComponent(upsertError.message)}`,
        url.origin,
      ),
    );
  }

  try {
    const { count } = await supabase
      .from("users_on_team")
      .select("*", { count: "exact", head: true })
      .eq("user_id", user.id);
    if ((count || 0) === 0) {
      return NextResponse.redirect(new URL("/teams/create", url.origin));
    }
    const { data: profile } = await supabase
      .from("users")
      .select("current_team_id")
      .eq("id", user.id)
      .maybeSingle<{ current_team_id: string | null }>();
    if (!profile?.current_team_id) {
      return NextResponse.redirect(new URL("/teams", url.origin));
    }
  } catch (err) {
    console.error("[OTP] Team check failed:", err);
  }

  if (returnTo) {
    return NextResponse.redirect(new URL(`/${returnTo}`, url.origin));
  }
  return NextResponse.redirect(new URL("/", url.origin));
}
