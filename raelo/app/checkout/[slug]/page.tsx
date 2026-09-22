import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { CheckoutButton } from "@/components/checkout/checkout-button";

function formatPrice(price: number, currency: string) {
  const symbol = currency === "NGN" ? "₦" : `${currency} `;
  return `${symbol}${Number(price).toLocaleString()}`;
}

export default async function CheckoutPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: pkg } = await supabase
    .from("packages")
    .select("id, name, slug, description, price, currency, billing_period, deliverables")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!pkg) {
    notFound();
  }

  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect(`/auth/login?next=/checkout/${slug}`);
  }

  const deliverables = Array.isArray(pkg.deliverables)
    ? (pkg.deliverables as string[])
    : [];

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-2xl px-6 py-20">
        <a href="/#packages" className="text-sm font-semibold text-black/50">
          ← Back to packages
        </a>

        <div className="mt-6 rounded-3xl border border-black/10 p-8">
          <p className="text-sm font-bold uppercase tracking-widest text-red-600">
            {pkg.billing_period}
          </p>
          <h1 className="mt-2 text-4xl font-bold">{pkg.name}</h1>

          {pkg.description && (
            <p className="mt-4 text-black/60">{pkg.description}</p>
          )}

          <p className="mt-6 text-4xl font-bold">
            {formatPrice(pkg.price, pkg.currency)}
          </p>

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
            <CheckoutButton packageId={pkg.id} packageName={pkg.name} />
          </div>
        </div>
      </div>
    </main>
  );
}
