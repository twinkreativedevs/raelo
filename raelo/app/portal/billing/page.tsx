import type { Metadata } from "next";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";
import { PageHeader } from "@/components/portal/page-header";
import { SubscriptionActions } from "@/components/portal/subscription-actions";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { supabase, profile } = await requireProfile("/portal/billing");

  const [{ data: subscriptions }, { data: invoices }] = await Promise.all([
    supabase
      .from("subscriptions")
      .select(
        "id, status, started_at, expires_at, auto_renew, payment_method_id, renewal_failures, packages(name, price, currency)",
      )
      .eq("user_id", profile.id)
      .in("status", ["active", "paused", "expired"])
      .order("created_at", { ascending: false }),
    supabase
      .from("invoices")
      .select("id, invoice_number, total, currency, issued_at, status")
      .eq("user_id", profile.id)
      .order("issued_at", { ascending: false }),
  ]);

  // Card details are server-only (no client RLS on payment_methods); read
  // just the display columns for this user's cards.
  const methodIds = (subscriptions ?? [])
    .map((sub) => sub.payment_method_id)
    .filter((id): id is string => Boolean(id));
  const { data: methods } = methodIds.length
    ? await createAdminClient()
        .from("payment_methods")
        .select("id, brand, card_type, last4")
        .eq("user_id", profile.id)
        .in("id", methodIds)
    : { data: [] };

  const cardLabel = (id: string | null) => {
    const method = methods?.find((m) => m.id === id);
    if (!method) return null;
    const brand = method.brand || method.card_type || "Card";
    return `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${method.last4}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Subscription & invoices" />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Subscriptions</h2>
        {subscriptions?.length ? (
          <ul className="mt-2 divide-y divide-black/5">
            {subscriptions.map((sub) => {
              const pkg = sub.packages as unknown as {
                name: string;
                price: number;
                currency: string;
              } | null;
              const card = cardLabel(sub.payment_method_id);
              const autoRenewing = sub.auto_renew && Boolean(card);
              return (
                <li key={sub.id} className="space-y-3 py-4 text-sm">
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <span className="font-semibold">
                      {pkg?.name ?? "Package"}
                      {pkg && (
                        <span className="ml-2 font-normal text-black/50">
                          {formatMoney(pkg.price, pkg.currency)}/month
                        </span>
                      )}
                    </span>
                    <span className="capitalize text-black/60">{sub.status}</span>
                  </div>
                  <p className="text-black/60">
                    {sub.status === "expired"
                      ? `Ended ${formatDate(sub.expires_at)}`
                      : autoRenewing
                        ? `Renews automatically on ${formatDate(sub.expires_at)} using ${card}`
                        : `Paid until ${formatDate(sub.expires_at)}`}
                  </p>
                  {sub.renewal_failures > 0 && sub.status === "active" && (
                    <p className="text-red-600">
                      We couldn&apos;t charge your card for the renewal. Renew
                      now to keep your content coming.
                    </p>
                  )}
                  <SubscriptionActions
                    subscriptionId={sub.id}
                    autoRenew={sub.auto_renew}
                    hasCard={Boolean(card)}
                    canRenew={sub.status === "active" || sub.status === "expired"}
                  />
                </li>
              );
            })}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-black/60">
            You don&apos;t have a subscription yet.{" "}
            <Link
              href="/#packages"
              className="font-semibold text-[#ed1c24] underline underline-offset-4"
            >
              Choose a package
            </Link>
          </p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Invoices</h2>
        {invoices?.length ? (
          <ul className="mt-2 divide-y divide-black/5">
            {invoices.map((invoice) => (
              <li
                key={invoice.id}
                className="flex flex-wrap items-center justify-between gap-2 py-3 text-sm"
              >
                <span className="font-semibold">{invoice.invoice_number}</span>
                <span className="text-black/60">{formatDate(invoice.issued_at)}</span>
                <span>
                  {formatMoney(invoice.total, invoice.currency)}
                  {invoice.status === "void" && (
                    <span className="ml-2 text-black/40">(void)</span>
                  )}
                </span>
                <a
                  href={`/api/invoices/${invoice.id}`}
                  className="font-semibold text-[#ed1c24] underline underline-offset-4"
                >
                  Download PDF
                </a>
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-4 text-sm text-black/60">No invoices yet.</p>
        )}
      </section>
    </div>
  );
}
