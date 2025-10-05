// Server utilities (import directly from './server' in Server Components)
// DO NOT export here to prevent client bundling
// export { createServerClient, createServerAdminClient } from './server';

// Browser utilities (safe for client components)
export { createBrowserClient, getBrowserClient } from "./browser";
