import "server-only";

import { randomUUID } from "crypto";

import { logActivity } from "@/lib/activity";
import { afterResponse, notifyUser } from "@/lib/notifications";
import { chargeAuthorization } from "@/lib/paystack";
import { confirmOrderPayment, toKobo } from "@/lib/payments";
import { createAdminClient } from "@/lib/supabase/admin";

// Recurring billing. The daily cron (app/api/cron/billing) calls
// runBillingCycle(); the portal's "Renew now" button calls
// createRenewalOrder() and sends the client to Paystack.

/** Try a saved card this long before the period ends. */
const RENEW_AHEAD_MS = 24 * 60 * 60 * 1000;
/** Minimum gap between automatic attempts on the same subscription. */
const RETRY_GAP_MS = 20 * 60 * 60 * 1000;
/** Give up on automatic charges after this many failures in a row. */
export const MAX_RENEWAL_FAILURES = 3;
/** Keep access this long after expiry before marking a subscription expired. */
const GRACE_PERIOD_MS = 3 * 24 * 60 * 60 * 1000;
/** A pending renewal older than this is treated as abandoned. */
const STALE_PENDING_MS = 24 * 60 * 60 * 1000;
/** Upper bound on charges per cron run, to stay inside function time limits. */
const BATCH_SIZE = 25;

export type CreateRenewalOrderResult =
  | {
      ok: true;
      order: { id: string; order_number: string; amount: number; payment_reference: string };
      email: string;
    }
  | { ok: false; reason: "not_found" | "pending_exists" | "error" };

/**
 * Creates a pending renewal order for a subscription at the package's
 * current price.
 *
 * `replacePending`: true for a client clicking "Renew now" (any earlier
 * pending renewal is abandoned so they can start over); false for the cron,
 * which leaves a recent pending renewal alone.
 */
export async function createRenewalOrder(
  subscriptionId: string,
  { replacePending }: { replacePending: boolean },
): Promise<CreateRenewalOrderResult> {
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, user_id, package_id, packages(price, currency), profiles(email)")
    .eq("id", subscriptionId)
    .maybeSingle();

  const pkg = subscription?.packages as unknown as
    | { price: number; currency: string }
    | null;
  const profile = subscription?.profiles as unknown as { email: string | null } | null;

  if (!subscription || !pkg || !profile?.email) {
    return { ok: false, reason: "not_found" };
  }

  // Clear out pending renewals that are in the way. A late Paystack success
  // on an abandoned order still activates it (confirmOrderPayment re-checks
  // any non-paid order).
  let abandon = admin
    .from("orders")
    .update({ status: "abandoned", failure_reason: "superseded" })
    .eq("subscription_id", subscriptionId)
    .eq("kind", "renewal")
    .eq("status", "pending");
  if (!replacePending) {
    abandon = abandon.lt(
      "created_at",
      new Date(Date.now() - STALE_PENDING_MS).toISOString(),
    );
  }
  await abandon;

  const subtotal = Number(pkg.price);
  const { data: order, error } = await admin
    .from("orders")
    .insert({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      package_id: subscription.package_id,
      kind: "renewal",
      status: "pending",
      currency: pkg.currency,
      subtotal,
      discount_amount: 0,
      amount: subtotal,
      payment_reference: `raelo_rn_${randomUUID()}`,
    })
    .select("id, order_number, amount, payment_reference")
    .single();

  if (error || !order) {
    // 23505 = the one-pending-renewal unique index (migration 0014).
    if (error?.code === "23505") return { ok: false, reason: "pending_exists" };
    console.error("createRenewalOrder failed", subscriptionId, error?.message);
    return { ok: false, reason: "error" };
  }

  return { ok: true, order, email: profile.email };
}

async function recordFailure(
  subscriptionId: string,
  orderId: string | null,
  reason: string,
) {
  const admin = createAdminClient();

  if (orderId) {
    await admin
      .from("orders")
      .update({ status: "failed", failure_reason: reason.slice(0, 500) })
      .eq("id", orderId)
      .eq("status", "pending");
  }

  const { data: sub } = await admin
    .from("subscriptions")
    .select("user_id, renewal_failures, expires_at, packages(name)")
    .eq("id", subscriptionId)
    .single();

  if (sub) {
    await admin
      .from("subscriptions")
      .update({ renewal_failures: sub.renewal_failures + 1 })
      .eq("id", subscriptionId);

    await logActivity(sub.user_id, "renewal_failed", {
      subscription_id: subscriptionId,
      order_id: orderId,
      reason,
      attempt: sub.renewal_failures + 1,
    });

    // One "couldn't renew" message per billing period, not per retry.
    const pkg = sub.packages as unknown as { name: string } | null;
    await afterResponse(() =>
      notifyUser(
        "subscription_expiring",
        sub.user_id,
        { packageName: pkg?.name ?? "your package", expiresAt: sub.expires_at, reason },
        { dedupeKey: `renewal-failed:${subscriptionId}:${sub.expires_at}`, dedupeHours: 24 * 40 },
      ),
    );
  }
}

type RenewalOutcome = "renewed" | "pending" | "failed" | "skipped";

/** Charges the subscription's saved card for the next period. */
export async function renewWithSavedCard(subscriptionId: string): Promise<RenewalOutcome> {
  const admin = createAdminClient();

  const { data: sub } = await admin
    .from("subscriptions")
    .select("id, payment_methods(authorization_code, email, reusable)")
    .eq("id", subscriptionId)
    .single();

  const method = sub?.payment_methods as unknown as
    | { authorization_code: string; email: string; reusable: boolean }
    | null;

  if (!method?.reusable) return "skipped";

  const created = await createRenewalOrder(subscriptionId, { replacePending: false });
  if (!created.ok) {
    if (created.reason === "pending_exists") return "pending";
    await recordFailure(subscriptionId, null, `create_order:${created.reason}`);
    return "failed";
  }

  const { order } = created;

  let charge;
  try {
    charge = await chargeAuthorization({
      email: method.email,
      authorizationCode: method.authorization_code,
      amountKobo: toKobo(order.amount),
      reference: order.payment_reference,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        subscription_id: subscriptionId,
        kind: "renewal",
      },
    });
  } catch (error) {
    await recordFailure(
      subscriptionId,
      order.id,
      error instanceof Error ? error.message : "charge_error",
    );
    return "failed";
  }

  if (charge.status === "success") {
    // Re-verifies with Paystack, then activates + invoices idempotently.
    const result = await confirmOrderPayment(order.payment_reference);
    return result.status === "paid" || result.status === "already_paid"
      ? "renewed"
      : "pending";
  }

  if (charge.status === "failed") {
    await recordFailure(
      subscriptionId,
      order.id,
      charge.gateway_response ?? "declined",
    );
    return "failed";
  }

  // Pending/processing: the charge.success webhook will finish it.
  return "pending";
}

export interface BillingCycleSummary {
  attempted: number;
  renewed: number;
  pending: number;
  failed: number;
  skipped: number;
  expired: number;
}

/**
 * One pass of recurring billing:
 *   1. charge saved cards for subscriptions ending within a day
 *   2. mark subscriptions expired once the grace period has passed
 */
export async function runBillingCycle(now = new Date()): Promise<BillingCycleSummary> {
  const admin = createAdminClient();
  const summary: BillingCycleSummary = {
    attempted: 0,
    renewed: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
    expired: 0,
  };

  const retryCutoff = new Date(now.getTime() - RETRY_GAP_MS).toISOString();

  const { data: due, error } = await admin
    .from("subscriptions")
    .select("id")
    .eq("status", "active")
    .eq("auto_renew", true)
    .not("payment_method_id", "is", null)
    .lt("renewal_failures", MAX_RENEWAL_FAILURES)
    .lte("expires_at", new Date(now.getTime() + RENEW_AHEAD_MS).toISOString())
    .or(`last_renewal_attempt_at.is.null,last_renewal_attempt_at.lt."${retryCutoff}"`)
    .order("expires_at", { ascending: true })
    .limit(BATCH_SIZE);

  if (error) throw new Error(`Couldn't load due subscriptions: ${error.message}`);

  for (const { id } of due ?? []) {
    // Stamp first, so a crash mid-charge can't cause a retry within the gap.
    await admin
      .from("subscriptions")
      .update({ last_renewal_attempt_at: now.toISOString() })
      .eq("id", id);

    summary.attempted += 1;
    const outcome = await renewWithSavedCard(id);
    summary[outcome] += 1;
  }

  const { data: expired } = await admin
    .from("subscriptions")
    .update({ status: "expired" })
    .eq("status", "active")
    .lt("expires_at", new Date(now.getTime() - GRACE_PERIOD_MS).toISOString())
    .select("id, user_id");

  for (const sub of expired ?? []) {
    summary.expired += 1;
    await logActivity(sub.user_id, "subscription_expired", {
      subscription_id: sub.id,
    });
  }

  return summary;
}
