"use server";

import { and, eq } from "drizzle-orm";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { currentUser } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { initializeTransaction, paystackConfigured } from "@/lib/paystack";
import { toKobo } from "@/lib/payments";
import { createRenewalOrder } from "@/lib/renewals";

const { subscriptions } = schema;

/**
 * Returns the subscription if it belongs to the signed-in user. The lookup
 * runs as the user, so RLS guarantees ownership.
 */
async function getOwnSubscription(subscriptionId: string) {
  const auth = await currentUser();
  if (!auth || typeof subscriptionId !== "string") return null;

  const [subscription] = await auth.asUser((tx) =>
    tx
      .select({ id: subscriptions.id, user_id: subscriptions.user_id, status: subscriptions.status })
      .from(subscriptions)
      .where(and(eq(subscriptions.id, subscriptionId), eq(subscriptions.user_id, auth.profile.id))),
  ).catch(() => []);

  return subscription ?? null;
}

async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return (await headers()).get("origin") ?? "";
}

/** Pay for the next period now, via Paystack checkout. */
export async function renewNow(subscriptionId: string) {
  const subscription = await getOwnSubscription(subscriptionId);
  if (!subscription || !["active", "expired"].includes(subscription.status)) {
    return { error: "This subscription can't be renewed." };
  }
  if (!paystackConfigured()) {
    return { error: "Online payment isn't switched on yet. Please contact us to renew." };
  }

  const created = await createRenewalOrder(subscription.id, {
    replacePending: true,
  });
  if (!created.ok) {
    return { error: "Couldn't start the renewal. Please try again." };
  }

  try {
    const transaction = await initializeTransaction({
      email: created.email,
      amountKobo: toKobo(created.order.amount),
      reference: created.order.payment_reference,
      callbackUrl: `${await siteUrl()}/checkout/verify`,
      metadata: {
        order_id: created.order.id,
        order_number: created.order.order_number,
        subscription_id: subscription.id,
        kind: "renewal",
      },
    });
    return { url: transaction.authorization_url };
  } catch {
    return { error: "Couldn't reach the payment provider. Please try again." };
  }
}

/** Turn automatic card renewal on or off. */
export async function setAutoRenew(subscriptionId: string, autoRenew: boolean) {
  const subscription = await getOwnSubscription(subscriptionId);
  if (!subscription) return { error: "Subscription not found." };

  // Clients can't update subscriptions directly (RLS); ownership was checked
  // above, and only this one column changes.
  try {
    await db
      .update(subscriptions)
      .set({
        auto_renew: Boolean(autoRenew),
        // Turning it back on gives the saved card a fresh set of attempts.
        ...(autoRenew ? { renewal_failures: 0 } : {}),
      })
      .where(eq(subscriptions.id, subscription.id));
  } catch {
    return { error: "Couldn't update auto-renew. Please try again." };
  }

  await logActivity(subscription.user_id, "auto_renew_changed", {
    subscription_id: subscription.id,
    auto_renew: autoRenew,
  });

  revalidatePath("/portal/billing");
  return { ok: true as const };
}
