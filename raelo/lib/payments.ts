import "server-only";

import { logActivity } from "@/lib/activity";
import { recordCommission } from "@/lib/affiliates";
import { afterResponse, notifyAdmins, notifyUser } from "@/lib/notifications";
import {
  verifyTransaction,
  type VerifyTransactionResult,
} from "@/lib/paystack";
import { and, eq, ne } from "drizzle-orm";

import { db, schema } from "@/lib/db";
import type { InvoiceLineItem, Order, OrderStatus } from "@/lib/db/types";

const { orders, subscriptions, packages, profiles, payment_methods, invoices } = schema;

// Payment confirmation shared by the Paystack callback page
// (/checkout/verify) and, later, the Paystack webhook. Both can fire for the
// same payment in any order, so everything here is idempotent:
//   1. the order is claimed with a conditional update (pending -> paid), so
//      only one caller wins;
//   2. fulfilment (activate subscription, issue invoice) derives everything
//      from the order row, so re-running it changes nothing.

const BILLING_PERIOD_MONTHS: Record<string, number | null> = {
  monthly: 1,
  quarterly: 3,
  annual: 12,
  one_time: null,
};

type OrderRow = Pick<
  Order,
  | "id"
  | "order_number"
  | "user_id"
  | "subscription_id"
  | "package_id"
  | "kind"
  | "status"
  | "currency"
  | "subtotal"
  | "discount_amount"
  | "amount"
  | "paid_at"
  | "metadata"
  | "affiliate_id"
>;

const ORDER_COLUMNS = {
  id: orders.id,
  order_number: orders.order_number,
  user_id: orders.user_id,
  subscription_id: orders.subscription_id,
  package_id: orders.package_id,
  kind: orders.kind,
  status: orders.status,
  currency: orders.currency,
  subtotal: orders.subtotal,
  discount_amount: orders.discount_amount,
  amount: orders.amount,
  paid_at: orders.paid_at,
  metadata: orders.metadata,
  affiliate_id: orders.affiliate_id,
};

async function findOrder(where: ReturnType<typeof eq>) {
  const [row] = await db.select(ORDER_COLUMNS).from(orders).where(where);
  return (row as OrderRow | undefined) ?? null;
}

export type ConfirmPaymentResult =
  | { status: "paid"; order: OrderRow }
  | { status: "already_paid"; order: OrderRow }
  | { status: "not_found" }
  | { status: "unreachable" }
  | { status: "failed"; reason: "failed" | "abandoned" | "refunded" }
  | { status: "amount_mismatch" };

export function toKobo(amount: number) {
  return Math.round(Number(amount) * 100);
}

function addMonths(date: Date, months: number) {
  const result = new Date(date);
  result.setMonth(result.getMonth() + months);
  return result;
}

interface OrderPeriod {
  period_start: string;
  period_end: string | null;
}

function readPeriod(order: OrderRow): OrderPeriod | null {
  const meta = (order.metadata ?? {}) as Record<string, unknown>;
  if (typeof meta.period_start !== "string") return null;
  return {
    period_start: meta.period_start,
    period_end: typeof meta.period_end === "string" ? meta.period_end : null,
  };
}

/**
 * Verifies `reference` with Paystack and, on success, marks the order paid,
 * activates/extends its subscription and issues an invoice.
 */
export async function confirmOrderPayment(
  reference: string,
): Promise<ConfirmPaymentResult> {
  const order = await findOrder(eq(orders.payment_reference, reference));
  if (!order) return { status: "not_found" };

  if (order.status === "paid") {
    // Heal a previous run that claimed the order but crashed mid-fulfilment.
    await fulfillOrder(order);
    return { status: "already_paid", order };
  }

  if (order.status === "refunded") {
    return { status: "failed", reason: "refunded" };
  }

  let verification;
  try {
    verification = await verifyTransaction(reference);
  } catch {
    return { status: "unreachable" };
  }

  if (verification.status !== "success") {
    const reason = verification.status === "abandoned" ? "abandoned" : "failed";
    await db
      .update(orders)
      .set({ status: reason satisfies OrderStatus })
      .where(and(eq(orders.id, order.id), eq(orders.status, "pending")));
    await db
      .update(subscriptions)
      .set({ status: "cancelled" })
      .where(and(eq(subscriptions.id, order.subscription_id), eq(subscriptions.status, "pending")));
    return { status: "failed", reason };
  }

  // Never trust the amount blindly: it must match what we asked for.
  if (
    verification.amount !== toKobo(order.amount) ||
    verification.currency !== order.currency
  ) {
    await db.update(orders).set({ failure_reason: "amount_mismatch" }).where(eq(orders.id, order.id));
    await logActivity(order.user_id, "payment_amount_mismatch", {
      reference,
      order_id: order.id,
      expected_kobo: toKobo(order.amount),
      received_kobo: verification.amount,
      expected_currency: order.currency,
      received_currency: verification.currency,
    });
    return { status: "amount_mismatch" };
  }

  const paidAt = verification.paid_at
    ? new Date(verification.paid_at)
    : new Date();
  const period = await computePeriod(order, paidAt);

  // Claim: only one concurrent caller gets a row back.
  const [claimedRow] = await db
    .update(orders)
    .set({
      status: "paid",
      paid_at: paidAt.toISOString(),
      paystack_transaction_id: String(verification.id),
      payment_channel: verification.channel,
      failure_reason: null,
      metadata: {
        ...((order.metadata ?? {}) as Record<string, unknown>),
        ...period,
      },
    })
    .where(and(eq(orders.id, order.id), ne(orders.status, "paid")))
    .returning(ORDER_COLUMNS);
  const claimed = (claimedRow as OrderRow | undefined) ?? null;

  if (!claimed) {
    const current = await findOrder(eq(orders.id, order.id));
    await fulfillOrder(current!);
    return { status: "already_paid", order: current! };
  }

  await savePaymentMethod(claimed, verification);
  await fulfillOrder(claimed);
  await logActivity(claimed.user_id, "payment_completed", {
    reference,
    order_id: claimed.id,
    order_number: claimed.order_number,
    subscription_id: claimed.subscription_id,
    amount: claimed.amount,
    kind: claimed.kind,
  });
  await afterResponse(() => sendPaymentNotifications(claimed));

  return { status: "paid", order: claimed };
}

/** Client welcome/renewal message + admin alert for a newly paid order. */
async function sendPaymentNotifications(order: OrderRow) {
  const [[pkg], [client], [sub]] = await Promise.all([
    db.select({ name: packages.name }).from(packages).where(eq(packages.id, order.package_id)),
    db
      .select({ full_name: profiles.full_name, company_name: profiles.company_name, email: profiles.email })
      .from(profiles)
      .where(eq(profiles.id, order.user_id)),
    db.select({ expires_at: subscriptions.expires_at }).from(subscriptions).where(eq(subscriptions.id, order.subscription_id)),
  ]);

  const data = {
    packageName: pkg?.name ?? "your package",
    amount: Number(order.amount),
    orderNumber: order.order_number,
    expiresAt: sub?.expires_at ?? null,
  };

  await Promise.all([
    order.kind === "renewal"
      ? notifyUser("subscription_renewed", order.user_id, data)
      : notifyUser("order_paid", order.user_id, data),
    notifyAdmins("order_paid", "admin_new_order", {
      ...data,
      kind: order.kind,
      clientName: client?.company_name || client?.full_name || client?.email || "A client",
    }),
  ]);
}

/**
 * The paid period this order buys. New subscriptions start when paid;
 * renewals stack on top of any time still left on the subscription.
 */
async function computePeriod(order: OrderRow, paidAt: Date): Promise<OrderPeriod> {
  const [[pkg], [subscription]] = await Promise.all([
    db.select({ billing_period: packages.billing_period }).from(packages).where(eq(packages.id, order.package_id)),
    db
      .select({ status: subscriptions.status, expires_at: subscriptions.expires_at })
      .from(subscriptions)
      .where(eq(subscriptions.id, order.subscription_id)),
  ]);

  const months = BILLING_PERIOD_MONTHS[pkg?.billing_period ?? "monthly"] ?? null;

  let start = paidAt;
  if (
    order.kind === "renewal" &&
    subscription?.status === "active" &&
    subscription.expires_at &&
    new Date(subscription.expires_at) > paidAt
  ) {
    start = new Date(subscription.expires_at);
  }

  return {
    period_start: start.toISOString(),
    period_end: months ? addMonths(start, months).toISOString() : null,
  };
}

/**
 * Stores a reusable card authorization for automatic renewals and makes it
 * the subscription's payment method. Bank transfer / USSD payments aren't
 * reusable and are skipped (those clients renew manually).
 */
async function savePaymentMethod(
  order: OrderRow,
  verification: VerifyTransactionResult,
) {
  const auth = verification.authorization;
  if (!auth?.reusable || !auth.authorization_code) return;

  const values = {
        user_id: order.user_id,
        authorization_code: auth.authorization_code,
        signature: auth.signature ?? auth.authorization_code,
        email: verification.customer.email,
        customer_code: verification.customer.customer_code ?? null,
        channel: auth.channel,
        card_type: auth.card_type,
        brand: auth.brand,
        bank: auth.bank,
        last4: auth.last4,
        exp_month: auth.exp_month,
        exp_year: auth.exp_year,
        reusable: true,
  };

  let methodId: string;
  try {
    const [method] = await db
      .insert(payment_methods)
      .values(values)
      .onConflictDoUpdate({ target: [payment_methods.user_id, payment_methods.signature], set: values })
      .returning({ id: payment_methods.id });
    methodId = method.id;
  } catch (error) {
    console.error("savePaymentMethod failed", order.id, error);
    return;
  }

  await db.update(subscriptions).set({ payment_method_id: methodId }).where(eq(subscriptions.id, order.subscription_id));
}

/** Idempotent: activates/extends the subscription and issues the invoice. */
async function fulfillOrder(order: OrderRow) {
  const period = readPeriod(order);

  if (period) {
    const [subscription] = await db
      .select({ status: subscriptions.status, started_at: subscriptions.started_at, expires_at: subscriptions.expires_at })
      .from(subscriptions)
      .where(eq(subscriptions.id, order.subscription_id));

    if (subscription) {
      const currentEnd = subscription.expires_at
        ? new Date(subscription.expires_at)
        : null;
      const newEnd = period.period_end ? new Date(period.period_end) : null;
      const expiresAt =
        currentEnd && newEnd && currentEnd > newEnd ? currentEnd : newEnd;

      await db
        .update(subscriptions)
        .set({
          status: "active",
          started_at: subscription.started_at ?? period.period_start,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          renewal_failures: 0,
          // A paid order turns a complimentary subscription into a paying one.
          complimentary: false,
        })
        .where(eq(subscriptions.id, order.subscription_id));
    }
  }

  await issueInvoice(order);

  const commission = await recordCommission(order);
  if (commission) {
    await logActivity(commission.affiliateUserId, "commission_earned", {
      order_id: order.id,
      amount: commission.amount,
    });
    await afterResponse(() =>
      notifyUser("commission_earned", commission.affiliateUserId, {
        amount: Number(commission.amount),
        orderNumber: order.order_number,
      }),
    );
  }
}

async function issueInvoice(order: OrderRow) {
  const [[pkg], [profile]] = await Promise.all([
    db.select({ name: packages.name }).from(packages).where(eq(packages.id, order.package_id)),
    db
      .select({ full_name: profiles.full_name, email: profiles.email, company_name: profiles.company_name })
      .from(profiles)
      .where(eq(profiles.id, order.user_id)),
  ]);

  const lineItems: InvoiceLineItem[] = [
    {
      description: `${pkg?.name ?? "Raelo"} subscription${
        order.kind === "renewal" ? " (renewal)" : ""
      }`,
      quantity: 1,
      unit_amount: Number(order.subtotal),
      amount: Number(order.subtotal),
    },
  ];

  try {
    await db
      .insert(invoices)
      .values({
      order_id: order.id,
      user_id: order.user_id,
      currency: order.currency,
      subtotal: order.subtotal,
      discount_amount: order.discount_amount,
      total: order.amount,
      line_items: lineItems,
      billed_to_name: profile?.full_name ?? null,
      billed_to_email: profile?.email ?? null,
      billed_to_company: profile?.company_name ?? null,
      issued_at: order.paid_at ?? new Date().toISOString(),
      })
      .onConflictDoNothing({ target: invoices.order_id });
  } catch (error) {
    console.error("issueInvoice failed", order.id, error);
  }
}
