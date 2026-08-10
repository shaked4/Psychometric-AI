/**
 * Feature flags derived only from NEXT_PUBLIC_* env vars, so the same check
 * yields the same answer on the server and in the browser bundle. Secret
 * keys (CLERK_SECRET_KEY, SUPABASE_SERVICE_ROLE_KEY) gate the privileged
 * server operations directly (middleware.ts, lib/supabase-server.ts) — if
 * those are missing while the public flag is on, the affected server calls
 * degrade gracefully instead of crashing, matching the rest of the app's
 * offline-fallback pattern.
 */
export const CLERK_ENABLED = Boolean(process.env.NEXT_PUBLIC_CLERK_PUBLISHABLE_KEY);

export const SUPABASE_ENABLED = Boolean(
  process.env.NEXT_PUBLIC_SUPABASE_URL && process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);
