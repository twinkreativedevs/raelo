import "server-only";

import { and, count, eq, gt, lte } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import { notifyUser } from "@/lib/notifications";

const MAX_REMINDERS = 3;
const GAP_HOURS = 72;
const GRACE_HOURS = 24;

/**
 * Nudges paying clients who haven't finished their brand brief: first
 * after a day, then every 3 days, at most 3 times. Run from the daily cron.
 */
export async function sendOnboardingReminders(now = new Date()) {
  const { subscriptions, onboarding_responses, notification_log } = schema;
  const cutoff = new Date(now.getTime() - GRACE_HOURS * 3600_000).toISOString();

  const [subs, briefs] = await Promise.all([
    db
      .select({ user_id: subscriptions.user_id })
      .from(subscriptions)
      .where(and(eq(subscriptions.status, "active"), lte(subscriptions.started_at, cutoff))),
    db
      .select({ user_id: onboarding_responses.user_id })
      .from(onboarding_responses)
      .where(eq(onboarding_responses.completed, true)),
  ]);

  const done = new Set(briefs.map((b) => b.user_id));
  const pending = [...new Set(subs.map((s) => s.user_id))].filter((id) => !done.has(id));

  let sent = 0;
  for (const userId of pending) {
    const key = `onboarding-reminder:${userId}`;
    const [sentCount] = await db
      .select({ n: count() })
      .from(notification_log)
      .where(
        and(
          eq(notification_log.dedupe_key, key),
          eq(notification_log.status, "sent"),
          eq(notification_log.channel, "email"),
        ),
      );
    if ((sentCount?.n ?? 0) >= MAX_REMINDERS) continue;

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
  const { subscriptions, packages } = schema;
  const horizon = new Date(now.getTime() + RENEWAL_NOTICE_DAYS * 86_400_000).toISOString();

  const subs = await db
    .select({
      id: subscriptions.id,
      user_id: subscriptions.user_id,
      expires_at: subscriptions.expires_at,
      auto_renew: subscriptions.auto_renew,
      payment_method_id: subscriptions.payment_method_id,
      package_name: packages.name,
    })
    .from(subscriptions)
    .innerJoin(packages, eq(packages.id, subscriptions.package_id))
    .where(
      and(
        eq(subscriptions.status, "active"),
        gt(subscriptions.expires_at, now.toISOString()),
        lte(subscriptions.expires_at, horizon),
      ),
    );

  let attempted = 0;
  for (const sub of subs) {
    if (sub.auto_renew && sub.payment_method_id) continue; // the card will be charged
    await notifyUser(
      "subscription_expiring",
      sub.user_id,
      { packageName: sub.package_name ?? "your package", expiresAt: sub.expires_at },
      { template: "renewal_due", dedupeKey: `renewal-due:${sub.id}:${sub.expires_at}`, dedupeHours: 24 * 40 },
    );
    attempted += 1;
  }
  return { attempted };
}
