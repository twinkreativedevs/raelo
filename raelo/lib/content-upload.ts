// Client-safe upload limits for the content bucket. Must match migration
// 0015, which enforces them server-side.
export const CONTENT_MAX_BYTES = 50 * 1024 * 1024;

export const CONTENT_MIME_TYPES = [
  "image/png",
  "image/jpeg",
  "image/webp",
  "image/gif",
  "video/mp4",
  "video/quicktime",
  "application/pdf",
];

export const PLATFORMS = ["Instagram", "TikTok", "Facebook", "X / Twitter", "LinkedIn", "YouTube"];
export const CONTENT_TYPES = ["Post", "Carousel", "Story", "Reel / video", "Calendar", "Other"];

/** Storage-safe object name: keeps the extension, strips everything odd. */
export function storageSafeName(name: string) {
  const cleaned = name
    .normalize("NFKD")
    .replace(/[^\w.\-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "")
    .slice(-80);
  return cleaned || "file";
}
