"use server";

import { randomUUID } from "crypto";
import { headers } from "next/headers";

import { createClient } from "@/lib/supabase/server";
import { initializeTransaction } from "@/lib/paystack";

export async function initCheckout(packageId: string) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user?.sub || !user?.email) {
    return { error: "You need to be signed in to check out." };
  }

  // The price ALWAYS comes from the database here — never from the client.
  const { data: pkg, error: pkgError } = await supabase
    .from("packages")
    .select("id, price, active")
    .eq("id", packageId)
    .maybeSingle();

  if (pkgError || !pkg || !pkg.active) {
    return { error: "This package is no longer available." };
  }

  const reference = `raelo_${randomUUID()}`;

  const { error: insertError } = await supabase.from("subscriptions").insert({
    user_id: user.sub as string,
    package_id: pkg.id,
    status: "pending",
    payment_reference: reference,
  });

  if (insertError) {
    return { error: "Couldn't start checkout. Please try again." };
  }

  const headersList = await headers();
  const origin =
    headersList.get("origin") ??
    (process.env.NEXT_PUBLIC_SITE_URL as string | undefined) ??
    "";

  try {
    const transaction = await initializeTransaction({
      email: user.email as string,
      amountKobo: Math.round(Number(pkg.price) * 100),
      reference,
      callbackUrl: `${origin}/checkout/verify`,
      metadata: { package_id: pkg.id, user_id: user.sub },
    });

    return { url: transaction.authorization_url };
  } catch {
    return { error: "Couldn't reach the payment provider. Please try again." };
  }
}
