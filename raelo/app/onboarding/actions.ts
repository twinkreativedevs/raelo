"use server";

import { revalidatePath } from "next/cache";

import { createClient } from "@/lib/supabase/server";
import { logActivity } from "@/lib/activity";
import { afterResponse, notifyAdmins, notifyStaff } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import {
  missingRequiredFields,
  sanitizeBrief,
  type BrandBriefInput,
} from "@/lib/brand-brief";
import { LOGO_EXTENSIONS } from "@/lib/logo-upload";

export type OnboardingStepData = BrandBriefInput;

async function getSession() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  return { supabase, userId };
}

/**
 * Called after every step so progress is never lost if the user closes the
 * tab. Does NOT mark onboarding as complete.
 */
export async function saveOnboardingProgress(patch: OnboardingStepData) {
  const { supabase, userId } = await getSession();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert({ ...sanitizeBrief(patch), user_id: userId }, { onConflict: "user_id" });

  if (error) {
    return { error: "Couldn't save your progress. Please try again." };
  }

  return { ok: true as const };
}

/**
 * Called on the final step. Validates required fields server-side (never
 * trust client-side validation alone) and flips `completed` to true.
 */
export async function completeOnboarding(patch: OnboardingStepData) {
  const { supabase, userId } = await getSession();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const brief = sanitizeBrief(patch);

  if (missingRequiredFields(brief).length > 0) {
    return { error: "Please fill in every required field before finishing." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert(
      { ...brief, user_id: userId, completed: true },
      { onConflict: "user_id" },
    );

  if (error) {
    return { error: "Couldn't complete onboarding. Please try again." };
  }

  await logActivity(userId, "onboarding_completed");
  await afterResponse(() => announceBriefCompleted(userId, brief.business_name));

  return { ok: true as const };
}

/** Tells admins and the client's assigned team that production can start. */
async function announceBriefCompleted(userId: string, businessName?: string) {
  const admin = createAdminClient();
  const [{ data: profile }, { data: assignments }] = await Promise.all([
    admin.from("profiles").select("full_name, email").eq("id", userId).single(),
    admin
      .from("subscription_assignments")
      .select("profile_id, subscriptions!inner(user_id)")
      .eq("subscriptions.user_id", userId),
  ]);
  const data = { clientName: businessName || profile?.full_name || profile?.email || "A client", clientId: userId };
  await Promise.all([
    notifyAdmins("onboarding_completed", "onboarding_completed", data),
    notifyStaff("onboarding_completed", [...new Set((assignments ?? []).map((a) => a.profile_id))], "onboarding_completed", data),
  ]);
}

/**
 * Portal "Brand" page: edit the brief after onboarding. Same validation as
 * completing onboarding; keeps the brief marked complete.
 */
export async function updateBrandBrief(patch: OnboardingStepData) {
  const { supabase, userId } = await getSession();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const brief = sanitizeBrief(patch);
  const missing = missingRequiredFields(brief);
  if (missing.length > 0) {
    return { error: "Please fill in every required field." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert(
      { ...brief, user_id: userId, completed: true },
      { onConflict: "user_id" },
    );

  if (error) {
    return { error: "Couldn't save your brand brief. Please try again." };
  }

  await logActivity(userId, "brand_brief_updated");
  revalidatePath("/portal/brand");
  return { ok: true as const };
}

/**
 * Records a logo the browser just uploaded to the brand-assets bucket.
 * Storage RLS already limits uploads to the user's own folder; this checks
 * the path again before saving it on the brief.
 */
export async function saveLogo(path: string) {
  const { supabase, userId } = await getSession();

  if (!userId) {
    return { error: "Your session expired. Please sign in again." };
  }

  const extension = path.split(".").pop()?.toLowerCase() ?? "";
  const validPath =
    typeof path === "string" &&
    path.startsWith(`${userId}/`) &&
    !path.includes("..") &&
    Object.values(LOGO_EXTENSIONS).includes(extension);

  if (!validPath) {
    return { error: "That upload doesn't look right. Please try again." };
  }

  const { error } = await supabase
    .from("onboarding_responses")
    .upsert({ user_id: userId, logo_path: path }, { onConflict: "user_id" });

  if (error) {
    return { error: "Couldn't save your logo. Please try again." };
  }

  revalidatePath("/portal/brand");
  return { ok: true as const };
}
