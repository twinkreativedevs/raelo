import { createClient as createSupabaseClient } from "@supabase/supabase-js";

/**
 * Service-role Supabase client. SERVER-ONLY.
 *
 * Never import this from a "use client" component, never send
 * SUPABASE_SERVICE_ROLE_KEY to the browser, and never widen its use beyond
 * trusted server code (e.g. flipping a subscription to "active" only after
 * Paystack verification has succeeded). It bypasses Row Level Security.
 *
 * Left untyped (no <Database> generic) to match the rest of this project's
 * Supabase clients (lib/supabase/client.ts, lib/supabase/server.ts) — see
 * lib/supabase/database.types.ts for the row shapes to reference manually.
 */
export function createAdminClient() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceRoleKey) {
    throw new Error(
      "Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY for the admin client",
    );
  }

  return createSupabaseClient(url, serviceRoleKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
