"use server";

import { randomUUID } from "crypto";
import { cookies, headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { initializeTransaction } from "@/lib/paystack";
import { toKobo } from "@/lib/payments";
import { REF_COOKIE, referralDiscount, resolveReferral } from "@/lib/affiliates";

// Prefer the configured site URL; the request origin is a local-dev fallback.
async function siteUrl() {
  const configured = process.env.NEXT_PUBLIC_SITE_URL;
  if (configured) return configured.replace(/\/$/, "");
  return (await headers()).get("origin") ?? "";
}

export async function initCheckout(packageId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub || !user?.email) {
    return { error: "You need to be signed in to check out." };
  }

  const userId = user.sub as string;

  // The price ALWAYS comes from the database here — never from the client.
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("id, name, price, currency, active")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgError || !pkg || !pkg.active) {
    return { error: "This package is no longer available." };
  }

  // Clients can't insert subscriptions/orders themselves (RLS, migration
  // 0008). We've authenticated the user above, so create them with the
  // service role.
  const admin = createAdminClient();
  const reference = `raelo_${randomUUID()}`;

  const { data: subscription, error: subError } = await admin
    .from("subscriptions")
    .insert({ user_id: userId, package_id: pkg.id, status: "pending" })
    .select("id")
    .single();

  if (subError || !subscription) {
    return { error: "Couldn't start checkout. Please try again." };
  }

  // Affiliate referral (cookie set by the proxy from ?ref=): discount on
  // the first payment, attributed to the affiliate for commission.
  const referral = await resolveReferral((await cookies()).get(REF_COOKIE)?.value, userId);
  const subtotal = Number(pkg.price);
  const discountAmount = referral ? referralDiscount(subtotal, referral.discountPercent) : 0;
  const amount = subtotal - discountAmount;

  const { data: order, error: orderError } = await admin
    .from("orders")
    .insert({
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
    .select("id, order_number")
    .single();

  if (orderError || !order) {
    await admin.from("subscriptions").delete().eq("id", subscription.id);
    return { error: "Couldn't start checkout. Please try again." };
  }

  try {
    const transaction = await initializeTransaction({
      email: user.email as string,
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
    return { error: "Couldn't reach the payment provider. Please try again." };
  }
}
