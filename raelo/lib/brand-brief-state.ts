import type { BrandBriefInput } from "@/lib/brand-brief";
import type { OnboardingResponse } from "@/lib/db/types";

/** Turns a stored brief row into form state for the brief editors. */
export function briefFormState(existing: OnboardingResponse | null): BrandBriefInput {
  const platforms = Array.isArray(existing?.social_platforms)
    ? (existing.social_platforms as string[])
    : [];
  const handles =
    existing?.social_handles && typeof existing.social_handles === "object"
      ? (existing.social_handles as Record<string, string>)
      : {};

  return {
    business_name: existing?.business_name ?? "",
    industry: existing?.industry ?? "",
    target_audience: existing?.target_audience ?? "",
    brand_voice: existing?.brand_voice ?? "",
    social_platforms: platforms,
    social_handles: handles,
    brand_colors: existing?.brand_colors ?? "",
    competitors: existing?.competitors ?? "",
    content_goals: existing?.content_goals ?? "",
    assets_url: existing?.assets_url ?? "",
  };
}
