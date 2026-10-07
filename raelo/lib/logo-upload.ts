// Limits for logo uploads. The browser checks them for quick feedback;
// app/api/uploads/route.ts enforces them in the upload token.
export const LOGO_MAX_BYTES = 5 * 1024 * 1024;

export const LOGO_EXTENSIONS: Record<string, string> = {
  "image/png": "png",
  "image/jpeg": "jpg",
  "image/webp": "webp",
  "image/svg+xml": "svg",
};
