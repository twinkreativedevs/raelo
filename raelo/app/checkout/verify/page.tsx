import Link from "next/link";

import { confirmOrderPayment } from "@/lib/payments";

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

  // All verification, activation and invoicing lives in lib/payments.ts so
  // the Paystack webhook can share it. Safe to re-run on refresh.
  const result = await confirmOrderPayment(reference);

  switch (result.status) {
    case "not_found":
      return (
        <VerifyResult
          tone="error"
          title="Transaction not found"
          message="We couldn't match this payment to a checkout on Raelo. Please contact support with your reference."
        />
      );
    case "already_paid":
      return (
        <VerifyResult
          tone="success"
          title="Payment already confirmed"
          message={`Order ${result.order.order_number} is already paid and your subscription is active. You're all set.`}
          ctaHref="/portal"
          ctaLabel="Go to your account"
        />
      );
    case "unreachable":
      return (
        <VerifyResult
          tone="error"
          title="Couldn't verify payment"
          message="We couldn't reach Paystack to confirm this payment. Please refresh in a moment or contact support."
        />
      );
    case "failed":
      return (
        <VerifyResult
          tone="error"
          title={
            result.reason === "abandoned" ? "Payment cancelled" : "Payment failed"
          }
          message="Your payment wasn't completed, so no subscription was activated. You can try again from the packages section."
          ctaHref="/#packages"
          ctaLabel="Back to packages"
        />
      );
    case "amount_mismatch":
      return (
        <VerifyResult
          tone="error"
          title="We need to double-check this payment"
          message="The amount received didn't match your order. Your subscription hasn't been activated — please contact support with your reference."
        />
      );
  }

  return (
    <VerifyResult
      tone="success"
      title="Payment confirmed"
      message={`Order ${result.order.order_number} is paid and your subscription is now active. Let's get your brand set up.`}
      ctaHref="/onboarding"
      ctaLabel="Continue to onboarding"
    />
  );
}
