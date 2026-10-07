import { and, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { cookies } from "next/headers";

import { formatPrice } from "@/lib/packages";
import { REF_COOKIE, referralDiscount, resolveReferral } from "@/lib/affiliates";

import { getSessionUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { paystackConfigured } from "@/lib/paystack";
import { CheckoutButton } from "@/components/checkout/checkout-button";

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const { packages } = schema;
  const [pkg] = await db
    .select({
      id: packages.id,
      name: packages.name,
      slug: packages.slug,
      description: packages.description,
      price: packages.price,
      currency: packages.currency,
      billing_period: packages.billing_period,
      deliverables: packages.deliverables,
    })
    .from(packages)
    .where(and(eq(packages.slug, slug), eq(packages.active, true)));

  if (!pkg) {
    notFound();
  }

  const userId = await getSessionUserId();
  const isSignedIn = Boolean(userId);

  // Same rules as initCheckout, so the price shown is the price charged.
  const referral = await resolveReferral((await cookies()).get(REF_COOKIE)?.value, userId);
  const discount = referral ? referralDiscount(Number(pkg.price), referral.discountPercent) : 0;

  const deliverables = Array.isArray(pkg.deliverables)
    ? (pkg.deliverables as string[])
    : [];

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <Link href="/#packages" className="text-sm font-semibold text-black/50">
          ← Back to packages
        </Link>

        <div className="mt-6 rounded-3xl border border-black/10 p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            {pkg.billing_period}
          </p>
          <h1 className="mt-2 text-4xl font-bold">{pkg.name}</h1>

          {pkg.description && (
            <p className="mt-4 text-black/60">{pkg.description}</p>
          )}

          {discount > 0 ? (
            <div className="mt-6">
              <p className="text-lg text-black/40 line-through">{formatPrice(pkg.price, pkg.currency)}</p>
              <p className="text-4xl font-bold">{formatPrice(Number(pkg.price) - discount, pkg.currency)}</p>
              <p className="mt-2 inline-block rounded-full bg-red-50 px-3 py-1 text-sm font-semibold text-red-700">
                {referral!.discountPercent}% referral discount on your first payment
              </p>
            </div>
          ) : (
            <p className="mt-6 text-4xl font-bold">
              {formatPrice(pkg.price, pkg.currency)}
            </p>
          )}

          {deliverables.length > 0 && (
            <ul className="mt-8 space-y-3">
              {deliverables.map((item) => (
                <li
                  key={item}
                  className="flex items-start gap-3 text-black/80"
                >
                  <span className="mt-1 h-1.5 w-1.5 shrink-0 rounded-full bg-red-600" />
                  {item}
                </li>
              ))}
            </ul>
          )}

          <div className="mt-10">
            {!paystackConfigured() ? (
              <p className="rounded-2xl bg-black/5 px-5 py-4 text-center text-sm text-black/70">
                Online payment opens soon. To start now, contact us and we&apos;ll set up your plan.
              </p>
            ) : isSignedIn ? (
              <CheckoutButton packageId={pkg.id} packageName={pkg.name} />
            ) : (
              <div className="space-y-3">
                <Link
                  href={`/auth/sign-up?next=/checkout/${pkg.slug}`}
                  className="block w-full rounded-full bg-red-600 py-4 text-center text-base font-semibold text-white hover:bg-red-700"
                >
                  Create an account to continue
                </Link>
                <p className="text-center text-sm text-black/60">
                  Already have an account?{" "}
                  <Link
                    href={`/auth/login?next=/checkout/${pkg.slug}`}
                    className="font-semibold text-black underline underline-offset-4"
                  >
                    Log in
                  </Link>
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}
