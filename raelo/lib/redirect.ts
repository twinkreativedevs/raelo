/**
 * Returns `next` only if it is a same-site relative path, otherwise the
 * fallback. Prevents open redirects via `?next=https://evil.example` or
 * protocol-relative `?next=//evil.example`.
 */
export function safeNextPath(
  next: string | null | undefined,
  fallback = "/portal",
): string {
  if (!next || typeof next !== "string") return fallback;
  if (!next.startsWith("/")) return fallback;
  if (next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}
