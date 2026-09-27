import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import type { ContentItem } from "@/lib/supabase/database.types";

// Content files live in the private `content` bucket. Callers must first
// load the rows with the *user's* Supabase client, so RLS has already
// decided the user may see them (clients: published batches only). Only
// then are URLs signed here with the service role.

export const CONTENT_BUCKET = "content";

type SignableItem = Pick<ContentItem, "id" | "storage_path" | "mime_type">;

export function isImage(item: Pick<ContentItem, "mime_type">) {
  return Boolean(item.mime_type?.startsWith("image/"));
}

export function isVideo(item: Pick<ContentItem, "mime_type">) {
  return Boolean(item.mime_type?.startsWith("video/"));
}

/** Short-lived preview URLs for image/video items, keyed by item id. */
export async function signPreviewUrls(
  items: SignableItem[],
  expiresInSeconds = 60 * 60,
): Promise<Record<string, string>> {
  const previewable = items.filter(
    (item) => item.storage_path && (isImage(item) || isVideo(item)),
  );
  if (previewable.length === 0) return {};

  const { data, error } = await createAdminClient()
    .storage.from(CONTENT_BUCKET)
    .createSignedUrls(
      previewable.map((item) => item.storage_path!),
      expiresInSeconds,
    );

  if (error || !data) {
    console.error("signPreviewUrls failed", error?.message);
    return {};
  }

  const byPath = new Map(data.map((entry) => [entry.path, entry.signedUrl]));
  const urls: Record<string, string> = {};
  for (const item of previewable) {
    const url = byPath.get(item.storage_path!);
    if (url) urls[item.id] = url;
  }
  return urls;
}

/** A filesystem-safe version of a name, keeping the extension. */
export function safeFileName(name: string) {
  return (
    name
      .normalize("NFKD")
      .replace(/[^\w.\- ]+/g, "")
      .replace(/\s+/g, "-")
      .replace(/-+/g, "-")
      .slice(0, 120) || "file"
  );
}

export function downloadName(
  item: Pick<ContentItem, "title" | "file_name" | "storage_path">,
) {
  if (item.file_name) return safeFileName(item.file_name);
  const extension = item.storage_path?.split(".").pop();
  return safeFileName(extension ? `${item.title}.${extension}` : item.title);
}
