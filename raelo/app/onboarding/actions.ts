"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { currentUser } from "@/lib/auth";
import { db, schema, type Tx } from "@/lib/db";
import { afterResponse, notifyAdmins, notifyStaff } from "@/lib/notifications";
import {
  missingRequiredFields,
  sanitizeBrief,
  type BrandBriefInput,
} from "@/lib/brand-brief";
import { LOGO_EXTENSIONS } from "@/lib/logo-upload";
import { BRAND_ASSETS_PREFIX, deleteFiles } from "@/lib/storage";

export type OnboardingStepData = BrandBriefInput;

const { onboarding_responses } = schema;
type BriefRow = Partial<typeof onboarding_responses.$inferInsert>;

/** Insert-or-update the user's brief, changing only the given fields. */
async function upsertBrief(tx: Tx, userId: string, fields: BriefRow) {
  await tx
    .insert(onboarding_responses)
    .values({ ...fields, user_id: userId })
    .onConflictDoUpdate({ target: onboarding_responses.user_id, set: fields });
}

/** Runs `fn` as the signed-in user; false if signed out or refused. */
async function asSignedInUser(fn: (tx: Tx, userId: string) => Promise<void>) {
  const auth = await currentUser();
  if (!auth) return { userId: null, ok: false };
  try {
    await auth.asUser((tx) => fn(tx, auth.profile.id));
    return { userId: auth.profile.id, ok: true };
  } catch (error) {
    console.error("brief update refused", error);
    return { userId: auth.profile.id, ok: false };
  }
}

type ActionResult = { ok: true; error?: undefined } | { error: string; ok?: undefined };
const SESSION_EXPIRED: ActionResult = { error: "Your session expired. Please sign in again." };

/**
 * Called after every step so progress is never lost if the user closes the
 * tab. Does NOT mark onboarding as complete.
 */
export async function saveOnboardingProgress(patch: OnboardingStepData): Promise<ActionResult> {
  const result = await asSignedInUser((tx, userId) => upsertBrief(tx, userId, sanitizeBrief(patch)));
  if (!result.userId) return SESSION_EXPIRED;
  if (!result.ok) return { error: "Couldn't save your progress. Please try again." };
  return { ok: true as const };
}

/**
 * Called on the final step. Validates required fields server-side (never
 * trust client-side validation alone) and flips `completed` to true.
 */
export async function completeOnboarding(patch: OnboardingStepData): Promise<ActionResult> {
  const brief = sanitizeBrief(patch);
  if (missingRequiredFields(brief).length > 0) {
    return { error: "Please fill in every required field before finishing." };
  }

  const result = await asSignedInUser((tx, userId) => upsertBrief(tx, userId, { ...brief, completed: true }));
  if (!result.userId) return SESSION_EXPIRED;
  if (!result.ok) return { error: "Couldn't complete onboarding. Please try again." };

  const userId = result.userId;
  await logActivity(userId, "onboarding_completed");
  await afterResponse(() => announceBriefCompleted(userId, brief.business_name));

  return { ok: true as const };
}

/** Tells admins and the client's assigned team that production can start. */
async function announceBriefCompleted(userId: string, businessName?: string) {
  const { profiles, subscription_assignments, subscriptions } = schema;
  const [[profile], assignments] = await Promise.all([
    db.select({ full_name: profiles.full_name, email: profiles.email }).from(profiles).where(eq(profiles.id, userId)),
    db
      .select({ profile_id: subscription_assignments.profile_id })
      .from(subscription_assignments)
      .innerJoin(subscriptions, eq(subscriptions.id, subscription_assignments.subscription_id))
      .where(eq(subscriptions.user_id, userId)),
  ]);
  const data = { clientName: businessName || profile?.full_name || profile?.email || "A client", clientId: userId };
  await Promise.all([
    notifyAdmins("onboarding_completed", "onboarding_completed", data),
    notifyStaff("onboarding_completed", [...new Set(assignments.map((a) => a.profile_id))], "onboarding_completed", data),
  ]);
}

/**
 * Portal "Brand" page: edit the brief after onboarding. Same validation as
 * completing onboarding; keeps the brief marked complete.
 */
export async function updateBrandBrief(patch: OnboardingStepData): Promise<ActionResult> {
  const brief = sanitizeBrief(patch);
  if (missingRequiredFields(brief).length > 0) {
    return { error: "Please fill in every required field." };
  }

  const result = await asSignedInUser((tx, userId) => upsertBrief(tx, userId, { ...brief, completed: true }));
  if (!result.userId) return SESSION_EXPIRED;
  if (!result.ok) return { error: "Couldn't save your brand brief. Please try again." };

  await logActivity(result.userId, "brand_brief_updated");
  revalidatePath("/portal/brand");
  return { ok: true as const };
}

/**
 * Records a logo the browser just uploaded. /api/uploads only signs uploads
 * into the user's own brand-assets/{userId}/ folder; this checks the path
 * again before saving it on the brief, and removes the previous logo.
 */
export async function saveLogo(path: string): Promise<ActionResult> {
  const auth = await currentUser();
  if (!auth) return SESSION_EXPIRED;
  const userId = auth.profile.id;

  const extension = typeof path === "string" ? (path.split(".").pop()?.toLowerCase() ?? "") : "";
  const validPath =
    typeof path === "string" &&
    path.startsWith(`${BRAND_ASSETS_PREFIX}${userId}/`) &&
    !path.includes("..") &&
    Object.values(LOGO_EXTENSIONS).includes(extension);

  if (!validPath) {
    return { error: "That upload doesn't look right. Please try again." };
  }

  let previous: string | null = null;
  try {
    await auth.asUser(async (tx) => {
      const [row] = await tx
        .select({ logo_path: onboarding_responses.logo_path })
        .from(onboarding_responses)
        .where(eq(onboarding_responses.user_id, userId));
      previous = row?.logo_path ?? null;
      await upsertBrief(tx, userId, { logo_path: path });
    });
  } catch (error) {
    console.error("saveLogo failed", error);
    return { error: "Couldn't save your logo. Please try again." };
  }

  if (previous && previous !== path) await deleteFiles([previous]);
  revalidatePath("/portal/brand");
  return { ok: true as const };
}
