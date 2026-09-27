import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isStaffRole, requireProfile } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Your account" };

export default async function PortalHome() {
  const { supabase, profile } = await requireProfile("/portal");

  // Login lands on /portal by default; the team works in /admin.
  if (isStaffRole(profile.role)) redirect("/admin");

  const [{ data: subscriptions }, { data: onboarding }, { data: batches }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, expires_at, packages(name)")
        .eq("user_id", profile.id)
        .in("status", ["active", "paused", "expired"])
        .order("created_at", { ascending: false }),
      supabase
        .from("onboarding_responses")
        .select("completed")
        .eq("user_id", profile.id)
        .maybeSingle(),
      // RLS only returns published batches to clients.
      supabase
        .from("content_batches")
        .select("id, title, published_at, content_items(count)")
        .order("published_at", { ascending: false })
        .limit(3),
    ]);

  const firstName = profile.full_name?.split(" ")[0];
  const active = subscriptions?.find((sub) => sub.status === "active");
  const current = active ?? subscriptions?.[0];
  const currentPkg = current?.packages as unknown as { name: string } | null;

  return (
    <div className="space-y-8">
      <PageHeader
        eyebrow="Your account"
        title={`Welcome${firstName ? `, ${firstName}` : ""}.`}
      />

      {current && !onboarding?.completed && (
        <div className="flex flex-col gap-4 rounded-2xl bg-[#ed1c24] p-6 text-white sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h2 className="font-bold">Tell us about your brand</h2>
            <p className="mt-1 text-sm text-white/80">
              We need your brand brief before we can start creating content.
            </p>
          </div>
          <Link
            href="/onboarding"
            className="shrink-0 rounded-full bg-white px-5 py-2.5 text-sm font-bold text-black"
          >
            Complete onboarding →
          </Link>
        </div>
      )}

      <div className="grid gap-5 md:grid-cols-3">
        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-black/40">
            Plan
          </p>
          <p className="mt-2 text-xl font-black">{currentPkg?.name ?? "None yet"}</p>
          <p className="mt-1 text-sm capitalize text-black/60">
            {current
              ? `${current.status} · until ${formatDate(current.expires_at)}`
              : "Pick a package to get started"}
          </p>
          <Link
            href={current ? "/portal/billing" : "/#packages"}
            className="mt-4 inline-block text-sm font-semibold text-[#ed1c24] underline underline-offset-4"
          >
            {current ? "Manage billing" : "View packages"}
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-black/40">
            Brand brief
          </p>
          <p className="mt-2 text-xl font-black">
            {onboarding?.completed ? "Complete" : "Not started"}
          </p>
          <p className="mt-1 text-sm text-black/60">
            Keep it up to date so your content stays on-brand.
          </p>
          <Link
            href={onboarding?.completed ? "/portal/brand" : "/onboarding"}
            className="mt-4 inline-block text-sm font-semibold text-[#ed1c24] underline underline-offset-4"
          >
            {onboarding?.completed ? "Edit brief" : "Start onboarding"}
          </Link>
        </div>

        <div className="rounded-2xl bg-white p-6 shadow-sm">
          <p className="text-xs font-bold uppercase tracking-widest text-black/40">
            Content delivered
          </p>
          <p className="mt-2 text-xl font-black">
            {batches?.length ? `${batches.length} recent batch${batches.length > 1 ? "es" : ""}` : "Nothing yet"}
          </p>
          <p className="mt-1 text-sm text-black/60">
            {batches?.length
              ? `Latest: ${formatDate(batches[0].published_at)}`
              : "We'll notify you when your first batch is ready."}
          </p>
          <Link
            href="/portal/content"
            className="mt-4 inline-block text-sm font-semibold text-[#ed1c24] underline underline-offset-4"
          >
            Go to content
          </Link>
        </div>
      </div>

      {batches && batches.length > 0 && (
        <section className="rounded-2xl bg-white p-6 shadow-sm">
          <h2 className="font-bold">Latest content</h2>
          <ul className="mt-2 divide-y divide-black/5">
            {batches.map((batch) => {
              const count =
                (batch.content_items as unknown as { count: number }[])?.[0]
                  ?.count ?? 0;
              return (
                <li key={batch.id}>
                  <Link
                    href={`/portal/content/${batch.id}`}
                    className="flex items-center justify-between gap-4 py-3 text-sm hover:text-[#ed1c24]"
                  >
                    <span className="font-semibold">{batch.title}</span>
                    <span className="text-black/50">
                      {count} file{count === 1 ? "" : "s"} ·{" "}
                      {formatDate(batch.published_at)}
                    </span>
                  </Link>
                </li>
              );
            })}
          </ul>
        </section>
      )}
    </div>
  );
}
