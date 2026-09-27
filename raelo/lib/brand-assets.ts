import "server-only";

import type { createClient } from "@/lib/supabase/server";

type ServerClient = Awaited<ReturnType<typeof createClient>>;

/**
 * Signed URL for a file in the private brand-assets bucket, created with the
 * caller's own client so storage RLS applies (owner, assigned team, admin).
 */
export async function signBrandAssetUrl(
  supabase: ServerClient,
  path: string | null | undefined,
  expiresInSeconds = 60 * 60,
) {
  if (!path) return null;
  const { data } = await supabase.storage
    .from("brand-assets")
    .createSignedUrl(path, expiresInSeconds);
  return data?.signedUrl ?? null;
}
