import type { Metadata } from "next";
import Link from "next/link";

import { affiliateSettings } from "@/lib/affiliates";
import { formatDate, formatMoney } from "@/lib/format";
import { createClient } from "@/lib/supabase/server";
import type { Affiliate, AffiliateBalance } from "@/lib/supabase/database.types";
import { Logo } from "@/components/brand/logo";
import { ApplyForm, PayoutForm } from "@/components/affiliate/forms";
import { CopyLink } from "@/components/affiliate/copy-link";

export const metadata: Metadata = {
  title: "Affiliate programme",
  description: "Earn commission by referring brands to Raelo.",
};

function Card({ children, className = "" }: { children: React.ReactNode; className?: string }) {
  return <section className={`rounded-2xl bg-white p-6 shadow-sm ${className}`}>{children}</section>;
}

export default async function AffiliatePage() {
  const supabase = await createClient();
  const { data: claims } = await supabase.auth.getClaims();
  const userId = claims?.claims?.sub as string | undefined;
  const rules = await affiliateSettings();

  const { data: affiliate } = userId
    ? await supabase.from("affiliates").select("*").eq("user_id", userId).maybeSingle<Affiliate>()
    : { data: null };

  const { data: profile } = userId
    ? await supabase.from("profiles").select("full_name").eq("id", userId).maybeSingle()
    : { data: null };

  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  return (
    <div className="min-h-screen bg-[#fafafa] text-[#111827]">
      <header className="border-b border-black/5 bg-white">
        <div className="mx-auto flex h-16 max-w-4xl items-center justify-between px-6">
          <Logo />
          {userId ? (
            <Link href="/portal" className="text-sm font-semibold text-black/60">Your account</Link>
          ) : (
            <Link href="/auth/login?next=/affiliate" className="text-sm font-semibold text-black/60">Log in</Link>
          )}
        </div>
      </header>

      <main className="mx-auto max-w-4xl space-y-6 px-6 py-12">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">Affiliate programme</p>
          <h1 className="mt-2 text-4xl font-black tracking-tight">Share Raelo. Earn on every sale.</h1>
        </div>

        {!affiliate || affiliate.status !== "approved" ? (
          <div className="grid gap-4 sm:grid-cols-3">
            <Card><p className="text-3xl font-black">{rules.defaultDiscount}%</p><p className="mt-1 text-sm text-black/60">off the first payment for people you refer</p></Card>
            <Card><p className="text-3xl font-black">{rules.defaultCommission}%</p><p className="mt-1 text-sm text-black/60">commission on every sale you bring in</p></Card>
            <Card><p className="text-3xl font-black">{rules.unlockThreshold}</p><p className="mt-1 text-sm text-black/60">confirmed sales to unlock payouts</p></Card>
          </div>
        ) : null}

        {!userId && (
          <Card className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <p className="text-sm text-black/70">Create a free account to apply. It takes a minute.</p>
            <div className="flex gap-3">
              <Link href="/auth/sign-up?next=/affiliate" className="rounded-full bg-[#ed1c24] px-6 py-3 text-sm font-bold text-white">Sign up to apply</Link>
              <Link href="/auth/login?next=/affiliate" className="rounded-full border border-black/20 px-6 py-3 text-sm font-bold">Log in</Link>
            </div>
          </Card>
        )}

        {userId && !affiliate && (
          <Card>
            <h2 className="mb-5 text-xl font-bold">Apply to become an affiliate</h2>
            <ApplyForm
              suggestedCode={(profile?.full_name ?? "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 24)}
            />
          </Card>
        )}

        {affiliate?.status === "pending" && (
          <Card><h2 className="font-bold">Application received</h2><p className="mt-2 text-sm text-black/60">We&apos;ll email you once it&apos;s reviewed. Your requested code is “{affiliate.code}”.</p></Card>
        )}
        {affiliate?.status === "rejected" && (
          <Card><h2 className="font-bold">Application not approved</h2><p className="mt-2 text-sm text-black/60">Thanks for your interest. Get in touch if you think this is a mistake.</p></Card>
        )}
        {affiliate?.status === "suspended" && (
          <Card><h2 className="font-bold">Your affiliate account is paused</h2><p className="mt-2 text-sm text-black/60">Your link isn&apos;t earning right now. Contact us for details.</p></Card>
        )}

        {affiliate?.status === "approved" && <AffiliateDashboard affiliate={affiliate} site={site} unlockThreshold={rules.unlockThreshold} />}
      </main>
    </div>
  );
}

async function AffiliateDashboard({ affiliate, site, unlockThreshold }: { affiliate: Affiliate; site: string; unlockThreshold: number }) {
  const supabase = await createClient();
  const [{ data: balance }, { data: commissions }, { data: payouts }] = await Promise.all([
    supabase.from("affiliate_balances").select("*").eq("affiliate_id", affiliate.id).maybeSingle<AffiliateBalance>(),
    supabase.from("commissions").select("id, amount, status, created_at, orders(order_number)").eq("affiliate_id", affiliate.id).order("created_at", { ascending: false }).limit(50),
    supabase.from("payouts").select("id, amount, reference, paid_at").eq("affiliate_id", affiliate.id).order("paid_at", { ascending: false }),
  ]);

  const sales = Number(balance?.confirmed_sales ?? 0);
  const progress = Math.min(100, Math.round((sales / Math.max(1, unlockThreshold)) * 100));

  return (
    <>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-bold">Your referral link</h2>
        <CopyLink url={`${site}/?ref=${affiliate.code}`} />
        <p className="mt-3 text-sm text-black/60">
          People who use it get {Number(affiliate.discount_percent)}% off their first payment. You earn {Number(affiliate.commission_percent)}% of what they pay.
        </p>
      </section>

      <div className="grid gap-4 sm:grid-cols-3">
        <section className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-black/40">Confirmed sales</p><p className="mt-2 text-3xl font-black">{sales}</p></section>
        <section className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-black/40">Unpaid earnings</p><p className="mt-2 text-3xl font-black">{formatMoney(Number(balance?.unpaid_total ?? 0), "NGN")}</p></section>
        <section className="rounded-2xl bg-white p-6 shadow-sm"><p className="text-xs font-bold uppercase tracking-widest text-black/40">Paid out</p><p className="mt-2 text-3xl font-black">{formatMoney(Number(balance?.paid_total ?? 0), "NGN")}</p></section>
      </div>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <div className="flex items-center justify-between text-sm">
          <span className="font-bold">{balance?.is_unlocked ? "Payouts unlocked" : "Progress to payouts"}</span>
          <span className="text-black/60">{sales} / {unlockThreshold} sales</span>
        </div>
        <div className="mt-3 h-2 rounded-full bg-red-100" role="progressbar" aria-valuenow={sales} aria-valuemax={unlockThreshold}>
          <div className="h-2 rounded-full bg-[#ed1c24]" style={{ width: `${progress}%` }} />
        </div>
        {!balance?.is_unlocked && (
          <p className="mt-2 text-xs text-black/50">Commissions build up from your first sale and become payable once you reach {unlockThreshold} confirmed sales.</p>
        )}
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-3 font-bold">Commissions</h2>
        {commissions?.length ? (
          <ul className="divide-y divide-black/5 text-sm">
            {commissions.map((c) => (
              <li key={c.id} className="flex justify-between gap-4 py-2">
                <span>{(c.orders as unknown as { order_number: string } | null)?.order_number}</span>
                <span className="capitalize text-black/50">{c.status}</span>
                <span className="tabular-nums">{formatMoney(Number(c.amount), "NGN")}</span>
                <span className="text-black/50">{formatDate(c.created_at)}</span>
              </li>
            ))}
          </ul>
        ) : (
          <p className="text-sm text-black/50">No sales yet. Share your link to get started.</p>
        )}
      </section>

      {!!payouts?.length && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="mb-3 font-bold">Payouts</h2>
          <ul className="divide-y divide-black/5 text-sm">
            {payouts.map((p) => (
              <li key={p.id} className="flex justify-between gap-4 py-2">
                <span>{formatDate(p.paid_at)}</span>
                <span className="text-black/50">{p.reference}</span>
                <span className="tabular-nums">{formatMoney(Number(p.amount), "NGN")}</span>
              </li>
            ))}
          </ul>
        </section>
      )}

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-4 font-bold">Payout account</h2>
        <PayoutForm initial={{ bank_name: affiliate.bank_name, account_number: affiliate.account_number, account_name: affiliate.account_name }} />
      </section>
    </>
  );
}
