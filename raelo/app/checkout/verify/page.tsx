import Link from "next/link";

import { verifyTransaction } from "@/lib/paystack";
import { createAdminClient } from "@/lib/supabase/admin";

function VerifyResult({
  title,
  message,
  tone,
  ctaHref = "/",
  ctaLabel = "Back to home",
}: {
  title: string;
  message: string;
  tone: "success" | "error";
  ctaHref?: string;
  ctaLabel?: string;
}) {
  return (
    <main className="flex min-h-screen items-center justify-center bg-white px-6 text-black">
      <div className="max-w-md text-center">
        <p
          className={`text-sm font-bold uppercase tracking-widest ${
            tone === "success" ? "text-red-600" : "text-black/40"
          }`}
        >
          {tone === "success" ? "Success" : "Payment issue"}
        </p>
        <h1 className="mt-3 text-3xl font-bold">{title}</h1>
        <p className="mt-4 text-black/60">{message}</p>
        <Link
          href={ctaHref}
          className="mt-8 inline-block rounded-full bg-black px-6 py-3 font-semibold text-white"
        >
          {ctaLabel}
        </Link>
      </div>
    </main>
  );
}

export default async function CheckoutVerifyPage({
  searchParams,
}: {
  searchParams: Promise<{ reference?: string; trxref?: string }>;
}) {
  const { reference: refParam, trxref } = await searchParams;
  const reference = refParam ?? trxref;

  if (!reference) {
    return (
      <VerifyResult
        tone="error"
        title="Missing payment reference"
        message="We couldn't find a transaction reference in the callback. If you completed a payment, please contact support."
      />
    );
  }

  // Service-role client: this route is the one place allowed to flip a
  // subscription's status, and only after Paystack confirms payment below.
  const admin = createAdminClient();

  const { data: subscription } = await admin
    .from("subscriptions")
    .select("id, status, user_id, package_id")
    .eq("payment_reference", reference)
    .maybeSingle();

  if (!subscription) {
    return (
      <VerifyResult
        tone="error"
        title="Transaction not found"
        message="We couldn't match this payment to a checkout on Raelo. Please contact support with your reference."
      />
    );
  }

  // Already processed — don't re-verify or double-log. Handles page
  // refreshes and Paystack occasionally hitting the callback twice.
  if (subscription.status === "active") {
    return (
      <VerifyResult
        tone="success"
        title="Payment already confirmed"
        message="This subscription is already active. You're all set."
        ctaHref="/protected"
        ctaLabel="Go to your account"
      />
    );
  }

  let verification;
  try {
    verification = await verifyTransaction(reference);
  } catch {
    return (
      <VerifyResult
        tone="error"
        title="Couldn't verify payment"
        message="We couldn't reach Paystack to confirm this payment. Please refresh in a moment or contact support."
      />
    );
  }

  if (verification.status !== "success") {
    await admin
      .from("subscriptions")
      .update({ status: "cancelled" })
      .eq("id", subscription.id);

    return (
      <VerifyResult
        tone="error"
        title={
          verification.status === "abandoned"
            ? "Payment cancelled"
            : "Payment failed"
        }
        message="Your payment wasn't completed, so no subscription was activated. You can try again from the packages section."
      />
    );
  }

  const { data: pkg } = await admin
    .from("packages")
    .select("price")
    .eq("id", subscription.package_id)
    .maybeSingle();

  const expectedKobo = pkg ? Math.round(Number(pkg.price) * 100) : 0;

  // Never trust the amount blindly — confirm it matches what the package
  // actually costs server-side before activating anything.
  if (expectedKobo && verification.amount !== expectedKobo) {
    await admin.from("activity_events").insert({
      user_id: subscription.user_id,
      event_type: "payment_amount_mismatch",
      metadata: {
        reference,
        expected_kobo: expectedKobo,
        received_kobo: verification.amount,
      },
    });

    return (
      <VerifyResult
        tone="error"
        title="We need to double-check this payment"
        message="The amount received didn't match the package price. Your subscription hasn't been activated — please contact support with your reference."
      />
    );
  }

  const now = new Date();
  const expiresAt = new Date(now);
  expiresAt.setMonth(expiresAt.getMonth() + 1);

  await admin
    .from("subscriptions")
    .update({
      status: "active",
      started_at: now.toISOString(),
      expires_at: expiresAt.toISOString(),
    })
    .eq("id", subscription.id);

  await admin.from("activity_events").insert({
    user_id: subscription.user_id,
    event_type: "payment_completed",
    metadata: { reference, subscription_id: subscription.id },
  });

  return (
    <VerifyResult
      tone="success"
      title="Payment confirmed"
      message="Your subscription is now active. Let's get your brand set up."
      ctaHref="/onboarding"
      ctaLabel="Continue to onboarding"
    />
  );
}
