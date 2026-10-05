import "server-only";

import { randomUUID } from "crypto";

import { logActivity } from "@/lib/activity";
import { afterResponse, notifyUser } from "@/lib/notifications";
import { chargeAuthorization } from "@/lib/paystack";
import { confirmOrderPayment, toKobo } from "@/lib/payments";
import { and, asc, eq, isNotNull, isNull, lt, lte, or, sql } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { subscriptions, orders, packages, profiles, payment_methods } = schema;

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
  const [subscription] = await db
    .select({
      id: subscriptions.id,
      user_id: subscriptions.user_id,
      package_id: subscriptions.package_id,
      price: packages.price,
      currency: packages.currency,
      email: profiles.email,
    })
    .from(subscriptions)
    .innerJoin(packages, eq(packages.id, subscriptions.package_id))
    .innerJoin(profiles, eq(profiles.id, subscriptions.user_id))
    .where(eq(subscriptions.id, subscriptionId));

  if (!subscription?.email) {
    return { ok: false, reason: "not_found" };
  }

  // Clear out pending renewals that are in the way. A late Paystack success
  // on an abandoned order still activates it (confirmOrderPayment re-checks
  // any non-paid order).
  await db
    .update(orders)
    .set({ status: "abandoned", failure_reason: "superseded" })
    .where(
      and(
        eq(orders.subscription_id, subscriptionId),
        eq(orders.kind, "renewal"),
        eq(orders.status, "pending"),
        replacePending ? undefined : lt(orders.created_at, new Date(Date.now() - STALE_PENDING_MS).toISOString()),
      ),
    );

  const subtotal = Number(subscription.price);
  try {
    const [order] = await db
      .insert(orders)
      .values({
      user_id: subscription.user_id,
      subscription_id: subscription.id,
      package_id: subscription.package_id,
      kind: "renewal",
      status: "pending",
      currency: subscription.currency,
      subtotal,
      discount_amount: 0,
      amount: subtotal,
      payment_reference: `raelo_rn_${randomUUID()}`,
      })
      .returning({
        id: orders.id,
        order_number: orders.order_number,
        amount: orders.amount,
        payment_reference: orders.payment_reference,
      });
    return { ok: true, order, email: subscription.email };
  } catch (error) {
    // 23505 = the one-pending-renewal unique index (migration 0014).
    if (isUniqueViolation(error)) return { ok: false, reason: "pending_exists" };
    console.error("createRenewalOrder failed", subscriptionId, error);
    return { ok: false, reason: "error" };
  }
}

async function recordFailure(
  subscriptionId: string,
  orderId: string | null,
  reason: string,
) {
  if (orderId) {
    await db
      .update(orders)
      .set({ status: "failed", failure_reason: reason.slice(0, 500) })
      .where(and(eq(orders.id, orderId), eq(orders.status, "pending")));
  }

  const [sub] = await db
    .select({
      user_id: subscriptions.user_id,
      renewal_failures: subscriptions.renewal_failures,
      expires_at: subscriptions.expires_at,
      package_name: packages.name,
    })
    .from(subscriptions)
    .innerJoin(packages, eq(packages.id, subscriptions.package_id))
    .where(eq(subscriptions.id, subscriptionId));

  if (sub) {
    await db
      .update(subscriptions)
      .set({ renewal_failures: sql`${subscriptions.renewal_failures} + 1` })
      .where(eq(subscriptions.id, subscriptionId));

    await logActivity(sub.user_id, "renewal_failed", {
      subscription_id: subscriptionId,
      order_id: orderId,
      reason,
      attempt: sub.renewal_failures + 1,
    });

    // One "couldn't renew" message per billing period, not per retry.
    await afterResponse(() =>
      notifyUser(
        "subscription_expiring",
        sub.user_id,
        { packageName: sub.package_name ?? "your package", expiresAt: sub.expires_at, reason },
        { dedupeKey: `renewal-failed:${subscriptionId}:${sub.expires_at}`, dedupeHours: 24 * 40 },
      ),
    );
  }
}

type RenewalOutcome = "renewed" | "pending" | "failed" | "skipped";

/** Charges the subscription's saved card for the next period. */
export async function renewWithSavedCard(subscriptionId: string): Promise<RenewalOutcome> {
  const [method] = await db
    .select({
      authorization_code: payment_methods.authorization_code,
      email: payment_methods.email,
      reusable: payment_methods.reusable,
    })
    .from(subscriptions)
    .innerJoin(payment_methods, eq(payment_methods.id, subscriptions.payment_method_id))
    .where(eq(subscriptions.id, subscriptionId));

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
  const summary: BillingCycleSummary = {
    attempted: 0,
    renewed: 0,
    pending: 0,
    failed: 0,
    skipped: 0,
    expired: 0,
  };

  const retryCutoff = new Date(now.getTime() - RETRY_GAP_MS).toISOString();

  const due = await db
    .select({ id: subscriptions.id })
    .from(subscriptions)
    .where(
      and(
        eq(subscriptions.status, "active"),
        eq(subscriptions.auto_renew, true),
        eq(subscriptions.complimentary, false),
        isNotNull(subscriptions.payment_method_id),
        lt(subscriptions.renewal_failures, MAX_RENEWAL_FAILURES),
        lte(subscriptions.expires_at, new Date(now.getTime() + RENEW_AHEAD_MS).toISOString()),
        or(isNull(subscriptions.last_renewal_attempt_at), lt(subscriptions.last_renewal_attempt_at, retryCutoff)),
      ),
    )
    .orderBy(asc(subscriptions.expires_at))
    .limit(BATCH_SIZE);

  for (const { id } of due) {
    // Stamp first, so a crash mid-charge can't cause a retry within the gap.
    await db
      .update(subscriptions)
      .set({ last_renewal_attempt_at: now.toISOString() })
      .where(eq(subscriptions.id, id));

    summary.attempted += 1;
    const outcome = await renewWithSavedCard(id);
    summary[outcome] += 1;
  }

  const expired = await db
    .update(subscriptions)
    .set({ status: "expired" })
    .where(
      and(
        eq(subscriptions.status, "active"),
        lt(subscriptions.expires_at, new Date(now.getTime() - GRACE_PERIOD_MS).toISOString()),
      ),
    )
    .returning({ id: subscriptions.id, user_id: subscriptions.user_id });

  for (const sub of expired) {
    summary.expired += 1;
    await logActivity(sub.user_id, "subscription_expired", {
      subscription_id: sub.id,
    });
  }

  return summary;
}

/** Postgres unique_violation (e.g. the one-pending-renewal index). */
export function isUniqueViolation(error: unknown) {
  const cause = (error as { cause?: { code?: string } })?.cause;
  return (error as { code?: string })?.code === "23505" || cause?.code === "23505";
}
