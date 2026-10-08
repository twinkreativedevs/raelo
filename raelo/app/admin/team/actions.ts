"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { createInvitedUser, passwordSetupLink } from "@/lib/better-auth";
import { db, schema } from "@/lib/db";
import type { TeamRole } from "@/lib/db/types";
import { afterResponse, sendAccountEmail } from "@/lib/notifications";
import { ROLE_LABELS, TEAM_ROLES } from "@/lib/roles";


/**
 * Adds a team member. New emails get an account and an invite link that
 * lands on "set your password"; an existing account (e.g. a client) is
 * promoted.
 */
export async function inviteTeamMember(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const fullName = String(formData.get("full_name") ?? "").trim().slice(0, 100);
  const role = String(formData.get("role") ?? "") as TeamRole;

  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) return { error: "Enter a valid email." };
  if (!TEAM_ROLES.includes(role)) return { error: "Pick a role." };

  // Owner connection: setting `role` is only allowed for admins / server
  // code (profile guard trigger), and the admin was authorised above.
  const [existing] = await db
    .select({ id: schema.profiles.id, full_name: schema.profiles.full_name })
    .from(schema.profiles)
    .where(sql`lower(${schema.profiles.email}) = ${email}`);

  let userId = existing?.id;
  if (!userId) {
    try {
      userId = await createInvitedUser(email, fullName);
    } catch (error) {
      console.error("createInvitedUser failed", error);
      return { error: "Couldn't create the account. Is this email already registered?" };
    }
  }

  await db
    .update(schema.profiles)
    .set({ role, is_active: true, ...(fullName && !existing ? { full_name: fullName } : {}) })
    .where(eq(schema.profiles.id, userId));

  let message = `${email} already had an account and is now ${ROLE_LABELS[role].toLowerCase()}.`;
  if (!existing) {
    const url = await passwordSetupLink(userId, 24);
    await afterResponse(() =>
      sendAccountEmail("team_invite", { email, name: fullName, userId }, { url, role: ROLE_LABELS[role].toLowerCase() }),
    );
    message = process.env.RESEND_API_KEY
      ? `Invite sent to ${email}.`
      : `Account created. Email isn't connected yet, so send ${email} this link to set their password (valid 24 hours): ${url}`;
  }

  await logActivity(userId, existing ? "team_member_promoted" : "team_member_invited", { role, by: auth.profile.id });
  revalidatePath("/admin/team");
  return { ok: true as const, message };
}

export async function updateTeamMember(profileId: string, change: { role?: string; is_active?: boolean }) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (profileId === auth.profile.id) return { error: "You can't change your own role or access." };

  const patch: { role?: string; is_active?: boolean } = {};
  if (change.role !== undefined) {
    if (![...TEAM_ROLES, "client"].includes(change.role as TeamRole)) return { error: "Invalid role." };
    patch.role = change.role;
  }
  if (change.is_active !== undefined) patch.is_active = Boolean(change.is_active);
  if (!Object.keys(patch).length) return { error: "Nothing to change." };

  const updated = await auth.asUser(async (tx) => {
    const rows = await tx
      .update(schema.profiles)
      .set(patch)
      .where(eq(schema.profiles.id, profileId))
      .returning({ id: schema.profiles.id });
    // Removing someone from the team also drops their client assignments.
    if (rows.length && (patch.role === "client" || patch.is_active === false)) {
      await tx
        .delete(schema.subscription_assignments)
        .where(and(eq(schema.subscription_assignments.profile_id, profileId)));
    }
    return rows.length > 0;
  });
  if (!updated) return { error: "Couldn't update this team member." };

  await logActivity(profileId, "team_member_updated", { ...patch, by: auth.profile.id });
  revalidatePath("/admin/team");
  return { ok: true as const };
}
