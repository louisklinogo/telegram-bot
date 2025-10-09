import { createServerClient } from "@cimantikos/supabase/server";
import type { NextRequest } from "next/server";
import { NextResponse } from "next/server";

export async function GET(_req: NextRequest) {
  try {
    const supabase = await createServerClient();
    const {
      data: { session },
      error,
    } = await supabase.auth.getSession();

    if (error) {
      return NextResponse.json({ loggedIn: false, error: error.message }, { status: 401 });
    }

    const token = session?.access_token ?? null;

    // Only include token in development to avoid leaking secrets in prod
    const body = {
      loggedIn: !!session,
      user: session?.user ? { id: session.user.id, email: session.user.email } : null,
      hasToken: !!token,
      ...(process.env.NODE_ENV !== "production" && token ? { token } : {}),
    };

    return NextResponse.json(body, { status: 200 });
  } catch (e: any) {
    return NextResponse.json(
      { loggedIn: false, error: e?.message || "Unknown error" },
      { status: 500 },
    );
  }
}
