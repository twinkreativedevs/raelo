"use server";

import { createClient } from "@/lib/supabase/server";

export interface OnboardingStepData {
  business_name?: string;
  industry?: string;
  target_audience?: string;
  brand_voice?: string;
  social_platforms?: string[];
  brand_colors?: string;
  competitors?: string;
  content_goals?: string;
  assets_url?: string;
}

async function getCurrentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;
  return user?.sub as string | undefined;
}

/**
 * Called after every step so progress is never lost if the user closes the
 * tab. Does NOT mark onboarding as complete.
 */
export async function saveOnboardingProgress(patch: OnboardingStepData) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert({ user_id: userId, ...patch }, { onConflict: "user_id" });

  if (error) {
    return { error: "Couldn't save your progress. Please try again." };
  }

  return { ok: true as const };
}

const REQUIRED_FIELDS: (keyof OnboardingStepData)[] = [
  "business_name",
  "industry",
  "target_audience",
  "brand_voice",
  "content_goals",
];

/**
 * Called on the final step. Validates required fields server-side (never
 * trust client-side validation alone) and flips `completed` to true.
 */
export async function completeOnboarding(patch: OnboardingStepData) {
  const supabase = await createClient();
  const userId = await getCurrentUserId();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const missing = REQUIRED_FIELDS.filter((field) => {
    const value = patch[field];
    return typeof value !== "string" || value.trim().length === 0;
  });

  if (missing.length > 0) {
    return { error: "Please fill in every required field before finishing." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert(
      { user_id: userId, ...patch, completed: true },
      { onConflict: "user_id" },
    );

  if (error) {
    return { error: "Couldn't complete onboarding. Please try again." };
  }

  await supabase.from("activity_events").insert({
    user_id: userId,
    event_type: "onboarding_completed",
    metadata: {},
  });

  return { ok: true as const };
}
