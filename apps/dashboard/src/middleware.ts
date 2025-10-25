import { updateSession } from "@Faworra/supabase/middleware";
import { type CookieOptions, createServerClient } from "@supabase/ssr";
import { type NextRequest, NextResponse } from "next/server";

export async function middleware(request: NextRequest) {
  // First, refresh Supabase session cookies (Edge-safe)
  const response = await updateSession(request, NextResponse.next());

  // Build a Supabase client bound to middleware request/response cookies to read session
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookies: {
      get(name: string) {
        return request.cookies.get(name)?.value;
      },
      set(name: string, value: string, options: CookieOptions) {
        request.cookies.set({ name, value, ...options });
        response.cookies.set({ name, value, ...options });
      },
      remove(name: string, options: CookieOptions) {
        request.cookies.set({ name, value: "", ...options });
        response.cookies.set({ name, value: "", ...options });
      },
    },
  });

  const url = new URL(request.url);
  const pathname = url.pathname;

  // Public routes allowed without authentication
  const isPublicRoute =
    pathname === "/login" ||
    pathname.startsWith("/auth/callback") ||
    pathname === "/favicon.ico" ||
    pathname.startsWith("/_next") ||
    pathname.startsWith("/api/debug");

  const {
    data: { session },
  } = await supabase.auth.getSession();

  // If not authenticated and not visiting a public route, redirect to /login with return_to
  if (!(session || isPublicRoute)) {
    const loginUrl = new URL("/login", url.origin);
    const encoded = `${pathname}${url.search}`.replace(/^\/+/, "");
    if (encoded) loginUrl.searchParams.set("return_to", encoded);
    return NextResponse.redirect(loginUrl);
  }

  // If authenticated, optional MFA gating and invite allowlist
  if (session) {
    try {
      const { data: mfaData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
      const requiresAal2 =
        mfaData?.nextLevel === "aal2" && mfaData?.nextLevel !== mfaData?.currentLevel;
      const onMfaPage = pathname === "/mfa/verify" || pathname === "/mfa/setup";
      if (requiresAal2 && !onMfaPage) {
        const loginUrl = new URL("/mfa/verify", url.origin);
        const encoded = `${pathname}${url.search}`.replace(/^\/+/, "");
        if (encoded) loginUrl.searchParams.set("return_to", encoded);
        return NextResponse.redirect(loginUrl);
      }
      // Allow proceeding to invite acceptance pages even if no current team
      if (pathname.startsWith("/teams/invite/")) {
        return response;
      }
    } catch {}
  }

  return response;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - api (API routes)
     */
    "/((?!_next/static|_next/image|favicon.ico|api).*)",
  ],
};
