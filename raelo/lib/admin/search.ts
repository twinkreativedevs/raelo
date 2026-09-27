/**
 * Turns free text into a safe `ilike` pattern for PostgREST filters:
 * LIKE wildcards (% _ \) are escaped so they match literally, and the
 * characters that delimit `.or(...)` expressions (, ( ) ") are dropped.
 */
export function ilikePattern(input: string | undefined, maxLength = 50) {
  const cleaned = (input ?? "").trim().slice(0, maxLength).replace(/[,()"]/g, " ").trim();
  if (!cleaned) return undefined;
  return `%${cleaned.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
