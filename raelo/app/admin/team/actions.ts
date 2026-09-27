"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { createAdminClient } from "@/lib/supabase/admin";

const TEAM_ROLES = ["admin", "account_manager", "designer"] as const;
type TeamRole = (typeof TEAM_ROLES)[number];

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return (await headers()).get("origin") ?? "";
}

/**
 * Adds a team member. New emails get a Supabase invite link that lands on
 * "set your password"; an existing account (e.g. a client) is promoted.
 */
export async function inviteTeamMember(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const role = String(formData.get("role") ?? "") as TeamRole;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (!TEAM_ROLES.includes(role)) return { error: "Pick a role." };

  // Service role: needed for auth admin APIs and to set `role` (the profile
  // guard trigger only lets admins/service role change it).
  const admin = createAdminClient();

  const { data: existing } = await admin.from("profiles").select("id, role").eq("email", email).maybeSingle();

  let userId = existing?.id;
  if (!userId) {
    const { data, error } = await admin.auth.admin.inviteUserByEmail(email, {
      data: { full_name: fullName },
      redirectTo: `${await siteUrl()}/auth/confirm?next=/auth/update-password`,
    });
    if (error || !data.user) return { error: error?.message ?? "Couldn't send the invite." };
    userId = data.user.id;
  }

  const { error: roleError } = await admin
    .from("profiles")
    .update({ role, is_active: true, ...(fullName && !existing ? { full_name: fullName } : {}) })
    .eq("id", userId);
  if (roleError) return { error: "Invite sent, but setting the role failed. Try again." };

  await logActivity(userId, existing ? "team_member_promoted" : "team_member_invited", { role, by: auth.profile.id });
  revalidatePath("/admin/team");
  return { ok: true as const, message: existing ? `${email} already had an account and is now a ${role.replace("_", " ")}.` : `Invite sent to ${email}.` };
}

export async function updateTeamMember(profileId: string, change: { role?: string; is_active?: boolean }) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (profileId === auth.profile.id) return { error: "You can't change your own role or access." };

  const patch: { role?: string; is_active?: boolean } = {};
  if (change.role !== undefined) {
    if (![...TEAM_ROLES, "client"].includes(change.role)) return { error: "Invalid role." };
    patch.role = change.role;
  }
  if (change.is_active !== undefined) patch.is_active = Boolean(change.is_active);

  const { data, error } = await auth.supabase.from("profiles").update(patch).eq("id", profileId).select("id").maybeSingle();
  if (error || !data) return { error: "Couldn't update this team member." };

  // Removing someone from the team also drops their client assignments.
  if (patch.role === "client" || patch.is_active === false) {
    await auth.supabase.from("subscription_assignments").delete().eq("profile_id", profileId);
  }

  await logActivity(profileId, "team_member_updated", { ...patch, by: auth.profile.id });
  revalidatePath("/admin/team");
  return { ok: true as const };
}
