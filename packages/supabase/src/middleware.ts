import { type CookieOptions, createServerClient } from "@supabase/ssr";

type NextRequestLike = {
  cookies: {
    get(name: string): { value: string } | undefined;
    set(init: { name: string; value: string } & CookieOptions): void;
  };
  url: string;
  headers: Headers;
};

type NextResponseLike = {
  cookies: {
    set(init: { name: string; value: string } & CookieOptions): void;
  };
};

export async function updateSession<T extends NextResponseLike>(
  request: NextRequestLike,
  response: T,
): Promise<T> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
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
    },
  );

  // CRITICAL: Must call getUser() to trigger session refresh and cookie updates
  await supabase.auth.getUser();

  return response;
}
