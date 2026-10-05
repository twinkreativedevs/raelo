import "server-only";

import { signedReadUrl } from "@/lib/storage";

/**
 * Signed URL for a client's logo in the private Blob store. Only call it
 * for a path read from a brief the viewer is allowed to see (loaded with
 * `asUser`: the owner, their assigned team, or an admin).
 */
export async function signBrandAssetUrl(path: string | null | undefined, expiresInSeconds = 60 * 60) {
  if (!path) return null;
  return signedReadUrl(path, expiresInSeconds);
}
