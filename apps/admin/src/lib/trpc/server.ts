import "server-only";

import type { AppRouter } from "@cimantikos/api/trpc/routers/_app";
import { db } from "@cimantikos/database/client";
import { createServerClient } from "@cimantikos/supabase/server";
import { dehydrate, HydrationBoundary } from "@tanstack/react-query";
import { createTRPCClient, httpBatchLink } from "@trpc/client";
import { createTRPCOptionsProxy, type TRPCQueryOptions } from "@trpc/tanstack-react-query";
import React, { cache } from "react";
import superjson from "superjson";
import { makeQueryClient } from "./query-client";

/**
 * Server-side data fetching utilities
 * Use these in Server Components for direct database access
 * 
 * ✅ IMPORTANT: These are cached using React.cache() to deduplicate
 * calls within the same request (layout + pages both need auth)
 */

export const getServerSession = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { session },
  } = await supabase.auth.getSession();
  return session;
});

export const getAuthenticatedUser = cache(async () => {
  const supabase = await createServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentTeamId = cache(async () => {
  const session = await getServerSession();
  if (!session) return null;

  const user = await db.query.users.findFirst({
    where: (users, { eq }) => eq(users.id, session.user.id),
  });

  return user?.currentTeamId || null;
});

export { db };

// ----------------------------------------------------------------------------
// Server-side tRPC utilities (SSR prefetch + hydration)
// ----------------------------------------------------------------------------

export const getQueryClient = cache(makeQueryClient);

export const trpc = createTRPCOptionsProxy<AppRouter>({
  queryClient: getQueryClient,
  client: createTRPCClient<AppRouter>({
    links: [
      httpBatchLink({
        url: `${process.env.NEXT_PUBLIC_API_URL || "http://localhost:3001"}/trpc`,
        transformer: superjson,
        async headers() {
          const session = await getServerSession();
          return {
            Authorization: session?.access_token ? `Bearer ${session.access_token}` : "",
          };
        },
      }),
    ],
  }),
});

/**
 * @deprecated Phase A complete - All pages now use initialData pattern
 * 
 * This function is kept for reference but should NOT be used in new code.
 * 
 * OLD PATTERN (wasteful):
 * ```typescript
 * await prefetch(trpc.resource.list.queryOptions({}));
 * return <HydrateClient><Component /></HydrateClient>
 * ```
 * 
 * NEW PATTERN (optimal):
 * ```typescript
 * const data = await getResource(db, { teamId });
 * return <Component initialData={data} />
 * ```
 */
export function HydrateClient(props: { children: React.ReactNode }) {
  const queryClient = getQueryClient();
  return React.createElement(
    HydrationBoundary as any,
    { state: dehydrate(queryClient) } as any,
    props.children,
  );
}

/**
 * @deprecated Phase A complete - Use direct DB queries + initialData instead
 * 
 * This creates double-fetching: server prefetch + client query.
 * Use direct database queries in Server Components and pass as initialData.
 */
export function prefetch<T extends ReturnType<TRPCQueryOptions<any>>>(queryOptions: T) {
  const queryClient = getQueryClient();
  if ((queryOptions as any).queryKey?.[1]?.type === "infinite") {
    void queryClient.prefetchInfiniteQuery(queryOptions as any);
  } else {
    void queryClient.prefetchQuery(queryOptions as any);
  }
}

/**
 * @deprecated Phase A complete - Use direct DB queries + initialData instead
 */
export function batchPrefetch<T extends ReturnType<TRPCQueryOptions<any>>>(queryOptionsArray: T[]) {
  const queryClient = getQueryClient();
  for (const queryOptions of queryOptionsArray) {
    if ((queryOptions as any).queryKey?.[1]?.type === "infinite") {
      void queryClient.prefetchInfiniteQuery(queryOptions as any);
    } else {
      void queryClient.prefetchQuery(queryOptions as any);
    }
  }
}
