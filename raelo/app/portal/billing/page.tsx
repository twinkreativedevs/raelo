import { and, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { db, schema } from "@/lib/db";
import { PageHeader } from "@/components/portal/page-header";
import { SubscriptionActions } from "@/components/portal/subscription-actions";

export const metadata: Metadata = { title: "Billing" };

export default async function BillingPage() {
  const { asUser, profile } = await requireProfile("/portal/billing");
  const { subscriptions: subs, packages, invoices: inv, payment_methods } = schema;

  const { subscriptions, invoices } = await asUser(async (tx) => {
    const [subscriptions, invoices] = await Promise.all([
      tx
        .select({
          id: subs.id,
          status: subs.status,
          started_at: subs.started_at,
          expires_at: subs.expires_at,
          auto_renew: subs.auto_renew,
          payment_method_id: subs.payment_method_id,
          renewal_failures: subs.renewal_failures,
          complimentary: subs.complimentary,
          package_name: packages.name,
          price: packages.price,
          currency: packages.currency,
        })
        .from(subs)
        .innerJoin(packages, eq(packages.id, subs.package_id))
        .where(and(eq(subs.user_id, profile.id), inArray(subs.status, ["active", "paused", "expired"])))
        .orderBy(desc(subs.created_at)),
      tx
        .select({ id: inv.id, invoice_number: inv.invoice_number, total: inv.total, currency: inv.currency, issued_at: inv.issued_at, status: inv.status })
        .from(inv)
        .where(eq(inv.user_id, profile.id))
        .orderBy(desc(inv.issued_at)),
    ]);
    return { subscriptions, invoices };
  });

  // Card details are server-only (no RLS access to payment_methods); read
  // just the display columns for this user's cards.
  const methodIds = subscriptions
    .map((sub) => sub.payment_method_id)
    .filter((id): id is string => Boolean(id));
  const methods = methodIds.length
    ? await db
        .select({ id: payment_methods.id, brand: payment_methods.brand, card_type: payment_methods.card_type, last4: payment_methods.last4 })
        .from(payment_methods)
        .where(and(eq(payment_methods.user_id, profile.id), inArray(payment_methods.id, methodIds)))
    : [];

  const cardLabel = (id: string | null) => {
    const method = methods.find((m) => m.id === id);
    if (!method) return null;
    const brand = method.brand || method.card_type || "Card";
    return `${brand.charAt(0).toUpperCase()}${brand.slice(1)} •••• ${method.last4}`;
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Billing" title="Subscription & invoices" />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="font-bold">Subscriptions</h2>
        {subscriptions.length ? (
          <ul className="mt-2 divide-y divide-black/5">
            {subscriptions.map((sub) => {
              const pkg = { name: sub.package_name, price: sub.price, currency: sub.currency };
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
                        : sub.complimentary
                          ? `Complimentary access until ${formatDate(sub.expires_at)}`
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
        {invoices.length ? (
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
