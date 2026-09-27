// Client-side limits for logo uploads. The brand-assets bucket enforces the
// same limits server-side (migration 0015).
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
