"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";

const MANUAL_STATUSES = ["active", "paused", "cancelled"] as const;

/** Admin override of a subscription's status (pause, resume, cancel). */
export async function setSubscriptionStatus(subscriptionId: string, status: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (!(MANUAL_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };

  const { data: sub, error } = await auth.supabase
    .from("subscriptions")
    .update({
      status,
      // Cancelling stops automatic renewal; resuming doesn't turn it back on.
      ...(status === "cancelled" ? { auto_renew: false } : {}),
    })
    .eq("id", subscriptionId)
    .neq("status", "pending")
    .select("id, user_id")
    .maybeSingle();

  if (error || !sub) return { error: "Couldn't update this subscription." };

  await logActivity(sub.user_id, "subscription_status_changed", {
    subscription_id: sub.id,
    status,
    by: auth.profile.id,
  });
  revalidatePath(`/admin/clients/${sub.user_id}`);
  return { ok: true as const };
}

export async function assignTeamMember(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const [profileId, role] = String(formData.get("member") ?? "").split(":");
  if (!subscriptionId || !profileId || !["designer", "account_manager"].includes(role)) {
    return { error: "Pick a team member." };
  }

  // The check_assignment_role trigger rejects clients and role mismatches.
  const { data: sub } = await auth.supabase.from("subscriptions").select("user_id").eq("id", subscriptionId).single();
  const { error } = await auth.supabase.from("subscription_assignments").insert({
    subscription_id: subscriptionId,
    profile_id: profileId,
    role: role as "designer" | "account_manager",
    assigned_by: auth.profile.id,
  });

  if (error) {
    return { error: error.code === "23505" ? "Already assigned." : "Couldn't assign this team member." };
  }

  await logActivity(sub?.user_id ?? null, "team_assigned", { subscription_id: subscriptionId, profile_id: profileId, role, by: auth.profile.id });
  revalidatePath(`/admin/clients/${sub?.user_id}`);
  return { ok: true as const };
}

export async function removeAssignment(assignmentId: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const { data, error } = await auth.supabase
    .from("subscription_assignments")
    .delete()
    .eq("id", assignmentId)
    .select("subscription_id, subscriptions(user_id)")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't remove this assignment." };
  const userId = (data.subscriptions as unknown as { user_id: string } | null)?.user_id;
  revalidatePath(`/admin/clients/${userId}`);
  return { ok: true as const };
}
