"use server";

import { createServerClient } from "@cimantikos/supabase/server";
import { upsertUserBasic } from "@cimantikos/supabase/mutations";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { CookiePreferredSignInProvider } from "@/lib/cookies";

export async function verifyOtpAction(formData: FormData) {
  const email = String(formData.get("email") || "").trim();
  const token = String(formData.get("token") || "").trim();
  const redirectTo = String(formData.get("redirect_to") || "/");

  if (!email || !token) {
    redirect(`/login?error=otp_missing_params`);
  }

  const supabase = await createServerClient();

  await supabase.auth.verifyOtp({ email, token, type: "email" });

  const {
    data: { session },
  } = await supabase.auth.getSession();

  if (!session) {
    redirect(`/login?error=no_session`);
  }

  (await cookies()).set(CookiePreferredSignInProvider, "otp", {
    // one year
    maxAge: 60 * 60 * 24 * 365,
  });

  // Ensure a row exists in public.users (first-login bootstrap)
  try {
    const admin = await createServerClient({ admin: true });
    await upsertUserBasic(admin, { id: session.user.id, email: session.user.email });
  } catch {}

  // Trust only same-origin paths
  let target = "/";
  try {
    const url = new URL(redirectTo, "http://localhost");
    target = `${url.pathname}${url.search}` || "/";
  } catch {
    target = redirectTo.startsWith("/") ? redirectTo : "/";
  }

  redirect(target);
}
