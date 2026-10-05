import "server-only";

import { count, inArray } from "drizzle-orm";

import { schema, type Tx } from "@/lib/db";
import type { ContentItem } from "@/lib/db/types";
import { signedReadUrls } from "@/lib/storage";

// Content files live in the private Blob store under content/ (see
// lib/storage.ts). Callers must first load the rows with `asUser`, so RLS
// has already decided the user may see them (clients: published batches
// only). Only then are URLs signed here.

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

  const byPath = await signedReadUrls(
    previewable.map((item) => item.storage_path!),
    expiresInSeconds,
  );
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

/** Number of files per batch, for the given batch ids (RLS applies via `tx`). */
export async function batchFileCounts(tx: Tx, batchIds: string[]) {
  if (!batchIds.length) return new Map<string, number>();
  const rows = await tx
    .select({ batch_id: schema.content_items.batch_id, n: count() })
    .from(schema.content_items)
    .where(inArray(schema.content_items.batch_id, batchIds))
    .groupBy(schema.content_items.batch_id);
  return new Map(rows.map((r) => [r.batch_id!, r.n]));
}
