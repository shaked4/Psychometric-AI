import "server-only";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * Server-only Supabase client using the service-role key, which bypasses
 * Row Level Security by design. This is intentional: the `attempts` table
 * (see supabase/schema.sql) has RLS enabled with zero policies, so it is
 * unreachable via the anon key under any circumstance — every write must
 * go through an API route that verifies the Clerk session first (see
 * app/api/sync/push/route.ts). The service-role key must never be exposed
 * to the browser, hence no NEXT_PUBLIC_ prefix and the "server-only" guard.
 */
let cachedClient: SupabaseClient | null | undefined;

export function getSupabaseServerClient(): SupabaseClient | null {
  if (cachedClient !== undefined) return cachedClient;

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    cachedClient = null;
    return cachedClient;
  }

  cachedClient = createClient(url, serviceRoleKey, {
    auth: { persistSession: false },
  });
  return cachedClient;
}
