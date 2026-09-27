"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { initializeTransaction } from "@/lib/paystack";
import { toKobo } from "@/lib/payments";
import { createRenewalOrder } from "@/lib/renewals";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/**
 * Returns the subscription if it belongs to the signed-in user. The lookup
 * uses the user's own client, so RLS guarantees ownership.
 */
async function getOwnSubscription(subscriptionId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data: subscription } = await supabase
    .from("subscriptions")
    .select("id, user_id, status")
    .eq("id", subscriptionId)
    .eq("user_id", userId)
    .maybeSingle();

  return subscription;
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
  const admin = createAdminClient();
  const { error } = await admin
    .from("subscriptions")
    .update({
      auto_renew: autoRenew,
      // Turning it back on gives the saved card a fresh set of attempts.
      ...(autoRenew ? { renewal_failures: 0 } : {}),
    })
    .eq("id", subscription.id);

  if (error) return { error: "Couldn't update auto-renew. Please try again." };

  await logActivity(subscription.user_id, "auto_renew_changed", {
    subscription_id: subscription.id,
    auto_renew: autoRenew,
  });

  revalidatePath("/portal/billing");
  return { ok: true as const };
}
