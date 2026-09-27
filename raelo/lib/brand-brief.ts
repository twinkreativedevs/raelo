// Shared by the onboarding wizard and the portal's Brand page: the brand
// brief fields, and server-side sanitising of whatever the browser sends.

export const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "YouTube",
] as const;

export interface BrandBriefInput {
  business_name?: string;
  industry?: string;
  target_audience?: string;
  brand_voice?: string;
  social_platforms?: string[];
  social_handles?: Record<string, string>;
  brand_colors?: string;
  competitors?: string;
  content_goals?: string;
  assets_url?: string;
}

export const REQUIRED_BRIEF_FIELDS = [
  "business_name",
  "industry",
  "target_audience",
  "brand_voice",
  "content_goals",
] as const satisfies readonly (keyof BrandBriefInput)[];

const TEXT_FIELDS = [
  "business_name",
  "industry",
  "target_audience",
  "brand_voice",
  "brand_colors",
  "competitors",
  "content_goals",
  "assets_url",
] as const satisfies readonly (keyof BrandBriefInput)[];

const MAX_TEXT = 2000;

function cleanText(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, MAX_TEXT) : undefined;
}

/**
 * Keeps only known brief fields with the right types. Server actions accept
 * arbitrary JSON from the browser, so never spread raw input into a row:
 * that would let a client set `completed`, `logo_path` or `user_id`.
 */
export function sanitizeBrief(input: unknown): BrandBriefInput {
  const raw = (input && typeof input === "object" ? input : {}) as Record<string, unknown>;
  const out: BrandBriefInput = {};

  for (const field of TEXT_FIELDS) {
    const value = cleanText(raw[field]);
    if (value !== undefined) out[field] = value;
  }

  if (out.assets_url && !/^https?:\/\//i.test(out.assets_url)) {
    out.assets_url = `https://${out.assets_url}`;
  }

  if (Array.isArray(raw.social_platforms)) {
    out.social_platforms = raw.social_platforms.filter(
      (p): p is string =>
        typeof p === "string" &&
        (PLATFORM_OPTIONS as readonly string[]).includes(p),
    );
  }

  if (raw.social_handles && typeof raw.social_handles === "object") {
    const handles: Record<string, string> = {};
    for (const platform of PLATFORM_OPTIONS) {
      const handle = cleanText((raw.social_handles as Record<string, unknown>)[platform]);
      if (handle) handles[platform] = handle.slice(0, 200);
    }
    out.social_handles = handles;
  }

  return out;
}

export function missingRequiredFields(brief: BrandBriefInput) {
  return REQUIRED_BRIEF_FIELDS.filter((field) => !brief[field]);
}
