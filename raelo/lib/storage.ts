import "server-only";

import { del, get, issueSignedToken, presignUrl, type IssuedSignedToken } from "@vercel/blob";

// File storage: one *private* Vercel Blob store (BLOB_READ_WRITE_TOKEN).
// Nothing in it is publicly readable. Pathnames:
//   content/{subscription_id}/{batch_id}/{random}-{file}   designed content
//   brand-assets/{user_id}/{file}                          client logos
// The database stores the pathname (content_items.storage_path,
// onboarding_responses.logo_path).
//
// Access is decided in server code *before* anything here is called:
// uploads are authorised in app/api/uploads/route.ts, and reads only
// happen after the row was loaded with `asUser` (RLS decided the user may
// see it). This module then signs short-lived URLs with the store token.

export const CONTENT_PREFIX = "content/";
export const BRAND_ASSETS_PREFIX = "brand-assets/";

export function storageConfigured() {
  return Boolean(process.env.BLOB_READ_WRITE_TOKEN);
}

// One store-wide read delegation, reused for an hour. It never leaves the
// server: each presigned URL is bound to a single pathname and expiry.
let readToken: { token: IssuedSignedToken; validUntil: number } | null = null;
let pending: Promise<IssuedSignedToken> | null = null;
const TOKEN_TTL_MS = 60 * 60 * 1000;
/** Pages wait at most this long for Blob before showing no previews. */
const BLOB_TIMEOUT_MS = 5000;

/**
 * Rejects after `ms`. The Blob SDK retries network errors up to 10 times
 * with backoff, so without this an outage would hang every page that
 * shows a file.
 */
function withTimeout<T>(promise: Promise<T>, ms: number) {
  return new Promise<T>((resolve, reject) => {
    const timer = setTimeout(() => reject(new Error(`Vercel Blob didn't answer within ${ms}ms`)), ms);
    promise.then(
      (value) => { clearTimeout(timer); resolve(value); },
      (error) => { clearTimeout(timer); reject(error); },
    );
  });
}

async function getReadToken() {
  if (readToken && readToken.validUntil - Date.now() > 10 * 60 * 1000) return readToken.token;
  // One request at a time, shared by every caller on this instance.
  if (!pending) {
    const validUntil = Date.now() + TOKEN_TTL_MS;
    pending = withTimeout(
      issueSignedToken({ pathname: "*", operations: ["get"], validUntil }),
      BLOB_TIMEOUT_MS,
    )
      .then((token) => {
        readToken = { token, validUntil };
        return token;
      })
      .finally(() => {
        pending = null;
      });
  }
  return pending;
}

/** A URL that can GET `pathname` for `expiresInSeconds` (max ~50 min). */
export async function signedReadUrl(pathname: string, expiresInSeconds = 60 * 60) {
  if (!storageConfigured()) return null;
  try {
    const token = await getReadToken();
    const { presignedUrl } = await presignUrl(token, {
      operation: "get",
      pathname,
      access: "private",
      validUntil: Math.min(Date.now() + expiresInSeconds * 1000, readToken!.validUntil),
    });
    return presignedUrl;
  } catch (error) {
    console.error("signedReadUrl failed", pathname, error);
    return null;
  }
}

/** Signed URLs for several pathnames, keyed by pathname. */
export async function signedReadUrls(pathnames: string[], expiresInSeconds = 60 * 60) {
  const entries = await Promise.all(
    [...new Set(pathnames)].map(async (p) => [p, await signedReadUrl(p, expiresInSeconds)] as const),
  );
  return new Map(entries.filter((e): e is readonly [string, string] => Boolean(e[1])));
}

/** The file's bytes (for zipping), or null if it's missing. */
export async function readFile(pathname: string) {
  const result = await withTimeout(get(pathname, { access: "private" }), 60_000);
  if (!result || result.statusCode !== 200) return null;
  return new Uint8Array(await new Response(result.stream).arrayBuffer());
}

/** Deletes files; never throws (a leftover file is harmless). */
export async function deleteFiles(pathnames: string[]) {
  if (!pathnames.length || !storageConfigured()) return;
  try {
    await withTimeout(del(pathnames), 10_000);
  } catch (error) {
    console.error("deleteFiles failed", error);
  }
}
