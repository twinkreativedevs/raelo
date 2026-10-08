"use server";

import { and, eq, ne } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { isAssignmentRole } from "@/lib/roles";
import { db, schema } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { afterResponse, notifyUser } from "@/lib/notifications";

const { subscriptions, subscription_assignments, packages, profiles } = schema;

const MANUAL_STATUSES = ["active", "paused", "cancelled"] as const;
const GRANT_MONTHS = [1, 3, 6, 12];

/** Admin override of a subscription's status (pause, resume, cancel). */
export async function setSubscriptionStatus(subscriptionId: string, status: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (!(MANUAL_STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };
  if (!isUuid(subscriptionId)) return { error: "Couldn't update this subscription." };

  const [sub] = await auth.asUser((tx) =>
    tx
      .update(subscriptions)
      .set({
        status,
        // Cancelling stops automatic renewal; resuming doesn't turn it back on.
        ...(status === "cancelled" ? { auto_renew: false } : {}),
      })
      .where(and(eq(subscriptions.id, subscriptionId), ne(subscriptions.status, "pending")))
      .returning({ id: subscriptions.id, user_id: subscriptions.user_id }),
  ).catch(() => []);

  if (!sub) return { error: "Couldn't update this subscription." };

  await logActivity(sub.user_id, "subscription_status_changed", {
    subscription_id: sub.id,
    status,
    by: auth.profile.id,
  });
  revalidatePath(`/admin/clients/${sub.user_id}`);
  return { ok: true as const };
}

/**
 * Gives a client an active subscription without payment (a demo, a
 * partner, the team's own test account). No order or invoice is created,
 * it never auto-renews, and it's left out of recurring revenue. If the
 * client later pays for a renewal it becomes an ordinary paid subscription.
 */
export async function grantComplimentarySubscription(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const clientId = String(formData.get("client_id") ?? "");
  const packageId = String(formData.get("package_id") ?? "");
  const months = Number(formData.get("months"));
  if (!isUuid(clientId) || !isUuid(packageId)) return { error: "Pick a package." };
  if (!GRANT_MONTHS.includes(months)) return { error: "Pick how long." };

  const [[client], [pkg]] = await Promise.all([
    db.select({ id: profiles.id, role: profiles.role }).from(profiles).where(eq(profiles.id, clientId)),
    db.select({ id: packages.id, name: packages.name }).from(packages).where(eq(packages.id, packageId)),
  ]);
  if (!client || client.role !== "client") return { error: "Only client accounts can get a subscription." };
  if (!pkg) return { error: "That package doesn't exist." };

  const start = new Date();
  const end = new Date(start);
  end.setMonth(end.getMonth() + months);

  // Owner connection: subscriptions are only ever written by server code
  // (migration 0008); the admin was authorised above.
  const [sub] = await db
    .insert(subscriptions)
    .values({
      user_id: client.id,
      package_id: pkg.id,
      status: "active",
      started_at: start.toISOString(),
      expires_at: end.toISOString(),
      auto_renew: false,
      complimentary: true,
    })
    .returning({ id: subscriptions.id });

  await logActivity(client.id, "subscription_granted", {
    subscription_id: sub.id,
    package: pkg.name,
    months,
    by: auth.profile.id,
  });
  // Welcome message (follows the "payment received" toggles), pointing the
  // client to the brand brief.
  await afterResponse(() =>
    notifyUser("order_paid", client.id, { packageName: pkg.name, expiresAt: end.toISOString() }, { template: "subscription_granted" }),
  );

  revalidatePath(`/admin/clients/${client.id}`);
  revalidatePath("/admin/clients");
  return { ok: true as const };
}

export async function assignTeamMember(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const subscriptionId = String(formData.get("subscription_id") ?? "");
  const [profileId, role] = String(formData.get("member") ?? "").split(":");
  if (!isUuid(subscriptionId) || !isUuid(profileId) || !isAssignmentRole(role)) {
    return { error: "Pick a team member." };
  }

  // The check_assignment_role trigger rejects clients and role mismatches.
  let clientId: string | null = null;
  try {
    clientId = await auth.asUser(async (tx) => {
      const [sub] = await tx.select({ user_id: subscriptions.user_id }).from(subscriptions).where(eq(subscriptions.id, subscriptionId));
      await tx.insert(subscription_assignments).values({
        subscription_id: subscriptionId,
        profile_id: profileId,
        role,
        assigned_by: auth.profile.id,
      });
      return sub?.user_id ?? null;
    });
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    return { error: code === "23505" ? "Already assigned." : "Couldn't assign this team member." };
  }

  await logActivity(clientId, "team_assigned", { subscription_id: subscriptionId, profile_id: profileId, role, by: auth.profile.id });
  revalidatePath(`/admin/clients/${clientId}`);
  return { ok: true as const };
}

export async function removeAssignment(assignmentId: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (!isUuid(assignmentId)) return { error: "Couldn't remove this assignment." };

  const removed = await auth.asUser(async (tx) => {
    const [row] = await tx
      .delete(subscription_assignments)
      .where(eq(subscription_assignments.id, assignmentId))
      .returning({ subscription_id: subscription_assignments.subscription_id });
    if (!row) return null;
    const [sub] = await tx.select({ user_id: subscriptions.user_id }).from(subscriptions).where(eq(subscriptions.id, row.subscription_id));
    return { userId: sub?.user_id ?? null };
  }).catch(() => null);

  if (!removed) return { error: "Couldn't remove this assignment." };
  revalidatePath(`/admin/clients/${removed.userId}`);
  return { ok: true as const };
}
