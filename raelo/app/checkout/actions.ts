"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";

import { eq } from "drizzle-orm";

import { getSessionUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { toKobo } from "@/lib/payments";
import { REF_COOKIE, referralDiscount, resolveReferral } from "@/lib/affiliates";

// Prefer the configured site URL; the request origin is a local-dev fallback.
async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return (await headers()).get("origin") ?? "";
}

export async function initCheckout(packageId: string) {
  const user = await getSessionUser();

  if (!user?.id || !user.email) {
    return { error: "You need to be signed in to check out." };
  }
  if (!paystackConfigured()) {
    return { error: "Online payment isn't switched on yet. Please contact us to subscribe." };
  }

  const userId = user.id;
  const { packages, subscriptions, orders } = schema;

  // The price ALWAYS comes from the database here — never from the client.
  const [pkg] = isUuid(packageId)
    ? await db
        .select({ id: packages.id, name: packages.name, price: packages.price, currency: packages.currency, active: packages.active })
        .from(packages)
        .where(eq(packages.id, packageId))
    : [];

  if (!pkg || !pkg.active) {
    return { error: "This package is no longer available." };
  }

  // Clients can't insert subscriptions/orders themselves (RLS, migration
  // 0008). We've authenticated the user above, so create them with the
  // owner connection.
  const reference = `raelo_${randomUUID()}`;

  const [subscription] = await db
    .insert(subscriptions)
    .values({ user_id: userId, package_id: pkg.id, status: "pending" })
    .returning({ id: subscriptions.id })
    .catch(() => []);

  if (!subscription) {
    return { error: "Couldn't start checkout. Please try again." };
  }

  // Affiliate referral (cookie set by the proxy from ?ref=): discount on
  // the first payment, attributed to the affiliate for commission.
  const referral = await resolveReferral((await cookies()).get(REF_COOKIE)?.value, userId);
  const subtotal = Number(pkg.price);
  const discountAmount = referral ? referralDiscount(subtotal, referral.discountPercent) : 0;
  const amount = subtotal - discountAmount;

  const [order] = await db
    .insert(orders)
    .values({
      user_id: userId,
      subscription_id: subscription.id,
      package_id: pkg.id,
      kind: "new",
      status: "pending",
      currency: pkg.currency,
      subtotal,
      discount_amount: discountAmount,
      amount,
      payment_reference: reference,
      affiliate_id: referral?.affiliateId ?? null,
      referral_code: referral?.code ?? null,
    })
    .returning({ id: orders.id, order_number: orders.order_number })
    .catch(() => []);

  if (!order) {
    await db.delete(subscriptions).where(eq(subscriptions.id, subscription.id));
    return { error: "Couldn't start checkout. Please try again." };
  }

  try {
    const transaction = await initializeTransaction({
      email: user.email,
      amountKobo: toKobo(amount),
      reference,
      callbackUrl: `${await siteUrl()}/checkout/verify`,
      metadata: {
        order_id: order.id,
        order_number: order.order_number,
        package_id: pkg.id,
        user_id: userId,
      },
    });

    return { url: transaction.authorization_url };
  } catch {
    // Nothing was charged: close this attempt so it doesn't linger as pending.
    await db.update(orders).set({ status: "abandoned", failure_reason: "paystack_init_failed" }).where(eq(orders.id, order.id));
    await db.update(subscriptions).set({ status: "cancelled" }).where(eq(subscriptions.id, subscription.id));
    return { error: "Couldn't reach the payment provider. Please try again." };
  }
}
