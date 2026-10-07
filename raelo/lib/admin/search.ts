/**
 * Turns free text into an `ilike` pattern ("contains"): LIKE wildcards
 * (% _ \) are escaped so they match literally. Values are always passed as
 * query parameters, so this only controls matching, not SQL safety.
 */
export function ilikePattern(input: string | undefined, maxLength = 50) {
  const cleaned = (input ?? "").trim().slice(0, maxLength);
  if (!cleaned) return undefined;
  return `%${cleaned.replace(/[\\%_]/g, (c) => `\\${c}`)}%`;
}
