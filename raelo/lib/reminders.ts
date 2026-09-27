import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";
import { notifyUser } from "@/lib/notifications";

const MAX_REMINDERS = 3;
const GAP_HOURS = 72;
const GRACE_HOURS = 24;

/**
 * Nudges paying clients who haven't finished their brand brief: first
 * after a day, then every 3 days, at most 3 times. Run from the daily cron.
 */
export async function sendOnboardingReminders(now = new Date()) {
  const admin = createAdminClient();
  const cutoff = new Date(now.getTime() - GRACE_HOURS * 3600_000).toISOString();

  const [{ data: subs }, { data: briefs }] = await Promise.all([
    admin.from("subscriptions").select("user_id").eq("status", "active").lte("started_at", cutoff),
    admin.from("onboarding_responses").select("user_id").eq("completed", true),
  ]);

  const done = new Set((briefs ?? []).map((b) => b.user_id));
  const pending = [...new Set((subs ?? []).map((s) => s.user_id))].filter((id) => !done.has(id));

  let sent = 0;
  for (const userId of pending) {
    const key = `onboarding-reminder:${userId}`;
    const { count } = await admin
      .from("notification_log")
      .select("id", { count: "exact", head: true })
      .eq("dedupe_key", key)
      .eq("status", "sent")
      .eq("channel", "email");
    if ((count ?? 0) >= MAX_REMINDERS) continue;

    // notifyUser skips if one was sent within GAP_HOURS.
    await notifyUser("onboarding_reminder", userId, {}, { dedupeKey: key, dedupeHours: GAP_HOURS });
    sent += 1;
  }
  return { considered: pending.length, attempted: sent };
}

const RENEWAL_NOTICE_DAYS = 3;

/**
 * Warns clients whose subscription won't renew by itself (auto-renew off,
 * or no saved card: bank transfer/USSD payers and imported subscriptions)
 * a few days before it ends. Once per billing period.
 */
export async function sendRenewalReminders(now = new Date()) {
  const admin = createAdminClient();
  const horizon = new Date(now.getTime() + RENEWAL_NOTICE_DAYS * 86_400_000).toISOString();

  const { data: subs } = await admin
    .from("subscriptions")
    .select("id, user_id, expires_at, auto_renew, payment_method_id, packages(name)")
    .eq("status", "active")
    .gt("expires_at", now.toISOString())
    .lte("expires_at", horizon);

  let attempted = 0;
  for (const sub of subs ?? []) {
    if (sub.auto_renew && sub.payment_method_id) continue; // the card will be charged
    const pkg = sub.packages as unknown as { name: string } | null;
    await notifyUser(
      "subscription_expiring",
      sub.user_id,
      { packageName: pkg?.name ?? "your package", expiresAt: sub.expires_at },
      { template: "renewal_due", dedupeKey: `renewal-due:${sub.id}:${sub.expires_at}`, dedupeHours: 24 * 40 },
    );
    attempted += 1;
  }
  return { attempted };
}
