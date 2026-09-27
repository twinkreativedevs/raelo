import "server-only";

import { logActivity } from "@/lib/activity";
import { recordCommission } from "@/lib/affiliates";
import { afterResponse, notifyAdmins, notifyUser } from "@/lib/notifications";
import {
  verifyTransaction,
  type VerifyTransactionResult,
} from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";
import type {
  InvoiceLineItem,
  Order,
  OrderStatus,
} from "@/lib/supabase/database.types";

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

const ORDER_COLUMNS =
  "id, order_number, user_id, subscription_id, package_id, kind, status, currency, subtotal, discount_amount, amount, paid_at, metadata, affiliate_id";

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
  const admin = createAdminClient();

  const { data: order } = await admin
    .from("orders")
    .select(ORDER_COLUMNS)
    .eq("payment_reference", reference)
    .maybeSingle<OrderRow>();

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
    await admin
      .from("orders")
      .update({ status: reason satisfies OrderStatus })
      .eq("id", order.id)
      .eq("status", "pending");
    await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", order.subscription_id)
      .eq("status", "pending");
    return { status: "failed", reason };
  }

  // Never trust the amount blindly: it must match what we asked for.
  if (
    verification.amount !== toKobo(order.amount) ||
    verification.currency !== order.currency
  ) {
    await admin
      .from("orders")
      .update({ failure_reason: "amount_mismatch" })
      .eq("id", order.id);
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
  const { data: claimed } = await admin
    .from("orders")
    .update({
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
    .eq("id", order.id)
    .neq("status", "paid")
    .select(ORDER_COLUMNS)
    .maybeSingle<OrderRow>();

  if (!claimed) {
    const { data: current } = await admin
      .from("orders")
      .select(ORDER_COLUMNS)
      .eq("id", order.id)
      .single<OrderRow>();
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
  const admin = createAdminClient();
  const [{ data: pkg }, { data: client }, { data: sub }] = await Promise.all([
    admin.from("packages").select("name").eq("id", order.package_id).single(),
    admin.from("profiles").select("full_name, company_name, email").eq("id", order.user_id).single(),
    admin.from("subscriptions").select("expires_at").eq("id", order.subscription_id).single(),
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
  const admin = createAdminClient();

  const [{ data: pkg }, { data: subscription }] = await Promise.all([
    admin
      .from("packages")
      .select("billing_period")
      .eq("id", order.package_id)
      .single(),
    admin
      .from("subscriptions")
      .select("status, expires_at")
      .eq("id", order.subscription_id)
      .single(),
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

  const admin = createAdminClient();
  const { data: method, error } = await admin
    .from("payment_methods")
    .upsert(
      {
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
      },
      { onConflict: "user_id,signature" },
    )
    .select("id")
    .single();

  if (error || !method) {
    console.error("savePaymentMethod failed", order.id, error?.message);
    return;
  }

  await admin
    .from("subscriptions")
    .update({ payment_method_id: method.id })
    .eq("id", order.subscription_id);
}

/** Idempotent: activates/extends the subscription and issues the invoice. */
async function fulfillOrder(order: OrderRow) {
  const admin = createAdminClient();
  const period = readPeriod(order);

  if (period) {
    const { data: subscription } = await admin
      .from("subscriptions")
      .select("status, started_at, expires_at")
      .eq("id", order.subscription_id)
      .single();

    if (subscription) {
      const currentEnd = subscription.expires_at
        ? new Date(subscription.expires_at)
        : null;
      const newEnd = period.period_end ? new Date(period.period_end) : null;
      const expiresAt =
        currentEnd && newEnd && currentEnd > newEnd ? currentEnd : newEnd;

      await admin
        .from("subscriptions")
        .update({
          status: "active",
          started_at: subscription.started_at ?? period.period_start,
          expires_at: expiresAt ? expiresAt.toISOString() : null,
          renewal_failures: 0,
        })
        .eq("id", order.subscription_id);
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
  const admin = createAdminClient();

  const [{ data: pkg }, { data: profile }] = await Promise.all([
    admin.from("packages").select("name").eq("id", order.package_id).single(),
    admin
      .from("profiles")
      .select("full_name, email, company_name")
      .eq("id", order.user_id)
      .single(),
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

  const { error } = await admin.from("invoices").upsert(
    {
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
    },
    { onConflict: "order_id", ignoreDuplicates: true },
  );

  if (error) console.error("issueInvoice failed", order.id, error.message);
}
