import "server-only";

import type { createClient } from "@/lib/supabase/server";
import type { RevenuePoint } from "@/components/admin/revenue-chart";

type Client = Awaited<ReturnType<typeof createClient>>;

// Dashboard/revenue numbers. Called with the signed-in admin's client, so
// RLS still applies (admins can read everything).

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
export async function revenueByMonth(supabase: Client, months = 12): Promise<RevenuePoint[]> {
  const from = startOfMonthUTC(new Date(), -(months - 1));
  const { data } = await supabase
    .from("orders")
    .select("amount, paid_at")
    .eq("status", "paid")
    .gte("paid_at", from.toISOString());

  const buckets = new Map<string, RevenuePoint>();
  for (let i = 0; i < months; i++) {
    const key = monthKey(startOfMonthUTC(from, i));
    buckets.set(key, { month: key, amount: 0, orders: 0 });
  }
  for (const order of data ?? []) {
    const bucket = buckets.get(monthKey(new Date(order.paid_at!)));
    if (bucket) {
      bucket.amount += Number(order.amount);
      bucket.orders += 1;
    }
  }
  return [...buckets.values()];
}

export async function dashboardStats(supabase: Client) {
  const monthStart = startOfMonthUTC().toISOString();
  const count = { count: "exact" as const, head: true };

  const [active, paidThisMonth, newClients, drafts, failedRenewals, activeSubs, briefs] =
    await Promise.all([
      supabase.from("subscriptions").select("id", count).eq("status", "active"),
      supabase.from("orders").select("amount").eq("status", "paid").gte("paid_at", monthStart),
      supabase.from("profiles").select("id", count).eq("role", "client").gte("created_at", monthStart),
      supabase.from("content_batches").select("id", count).eq("status", "draft"),
      supabase.from("subscriptions").select("id", count).eq("status", "active").gt("renewal_failures", 0),
      supabase.from("subscriptions").select("user_id, packages(price, billing_period)").eq("status", "active"),
      supabase.from("onboarding_responses").select("user_id").eq("completed", true),
    ]);

  // Monthly recurring revenue: each active subscription's price spread over
  // its billing period (one-time packages don't recur).
  const mrr = (activeSubs.data ?? []).reduce((sum, sub) => {
    const pkg = sub.packages as unknown as { price: number; billing_period: string } | null;
    const months = pkg ? MONTHS_PER_PERIOD[pkg.billing_period] : undefined;
    return months ? sum + Number(pkg!.price) / months : sum;
  }, 0);

  const completed = new Set((briefs.data ?? []).map((b) => b.user_id));
  const awaitingBrief = new Set(
    (activeSubs.data ?? []).map((s) => s.user_id).filter((id) => !completed.has(id)),
  ).size;

  return {
    activeSubscriptions: active.count ?? 0,
    mrr: Math.round(mrr),
    revenueThisMonth: (paidThisMonth.data ?? []).reduce((s, o) => s + Number(o.amount), 0),
    ordersThisMonth: paidThisMonth.data?.length ?? 0,
    newClientsThisMonth: newClients.count ?? 0,
    draftBatches: drafts.count ?? 0,
    failedRenewals: failedRenewals.count ?? 0,
    awaitingBrief,
  };
}
