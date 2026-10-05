import "server-only";

import { and, count, eq, gt, gte } from "drizzle-orm";

import { schema, type Tx } from "@/lib/db";
import type { RevenuePoint } from "@/components/admin/revenue-chart";

const { orders, subscriptions, profiles, content_batches, onboarding_responses, packages } = schema;

// Dashboard/revenue numbers. Called inside the signed-in admin's `asUser`,
// so RLS still applies (admins can read everything).

const MONTHS_PER_PERIOD: Record<string, number> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
};

export function monthKey(date: Date) {
  return `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function startOfMonthUTC(date = new Date(), offsetMonths = 0) {
  return new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth() + offsetMonths, 1));
}

/** Paid order totals per calendar month (UTC), oldest first, zero-filled. */
export async function revenueByMonth(tx: Tx, months = 12): Promise<RevenuePoint[]> {
  const from = startOfMonthUTC(new Date(), -(months - 1));
  const data = await tx
    .select({ amount: orders.amount, paid_at: orders.paid_at })
    .from(orders)
    .where(and(eq(orders.status, "paid"), gte(orders.paid_at, from.toISOString())));

  const buckets = new Map<string, RevenuePoint>();
  for (let i = 0; i < months; i++) {
    const key = monthKey(startOfMonthUTC(from, i));
    buckets.set(key, { month: key, amount: 0, orders: 0 });
  }
  for (const order of data) {
    const bucket = buckets.get(monthKey(new Date(order.paid_at!)));
    if (bucket) {
      bucket.amount += Number(order.amount);
      bucket.orders += 1;
    }
  }
  return [...buckets.values()];
}

export async function dashboardStats(tx: Tx) {
  const monthStart = startOfMonthUTC().toISOString();
  const activeSub = eq(subscriptions.status, "active");

  const [[active], paidThisMonth, [newClients], [drafts], [failedRenewals], activeSubs, briefs] =
    await Promise.all([
      tx.select({ n: count() }).from(subscriptions).where(activeSub),
      tx.select({ amount: orders.amount }).from(orders).where(and(eq(orders.status, "paid"), gte(orders.paid_at, monthStart))),
      tx.select({ n: count() }).from(profiles).where(and(eq(profiles.role, "client"), gte(profiles.created_at, monthStart))),
      tx.select({ n: count() }).from(content_batches).where(eq(content_batches.status, "draft")),
      tx.select({ n: count() }).from(subscriptions).where(and(activeSub, gt(subscriptions.renewal_failures, 0))),
      tx
        .select({
          user_id: subscriptions.user_id,
          complimentary: subscriptions.complimentary,
          price: packages.price,
          billing_period: packages.billing_period,
        })
        .from(subscriptions)
        .innerJoin(packages, eq(packages.id, subscriptions.package_id))
        .where(activeSub),
      tx.select({ user_id: onboarding_responses.user_id }).from(onboarding_responses).where(eq(onboarding_responses.completed, true)),
    ]);

  // Monthly recurring revenue: each paying active subscription's price
  // spread over its billing period (one-time packages don't recur;
  // complimentary ones bring in nothing).
  const mrr = activeSubs.reduce((sum, sub) => {
    const months = MONTHS_PER_PERIOD[sub.billing_period];
    return months && !sub.complimentary ? sum + Number(sub.price) / months : sum;
  }, 0);

  const completed = new Set(briefs.map((b) => b.user_id));
  const awaitingBrief = new Set(activeSubs.map((s) => s.user_id).filter((id) => !completed.has(id))).size;

  return {
    activeSubscriptions: active?.n ?? 0,
    mrr: Math.round(mrr),
    revenueThisMonth: paidThisMonth.reduce((s, o) => s + Number(o.amount), 0),
    ordersThisMonth: paidThisMonth.length,
    newClientsThisMonth: newClients?.n ?? 0,
    draftBatches: drafts?.n ?? 0,
    failedRenewals: failedRenewals?.n ?? 0,
    awaitingBrief,
  };
}
