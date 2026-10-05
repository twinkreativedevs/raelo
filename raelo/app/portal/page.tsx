import { and, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";

import { isStaffRole, requireProfile } from "@/lib/auth";
import { batchFileCounts } from "@/lib/content";
import { schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Your account" };

export default async function PortalHome() {
  const { asUser, profile } = await requireProfile("/portal");

  // Login lands on /portal by default; the team works in /admin.
  if (isStaffRole(profile.role)) redirect("/admin");

  const { subscriptions, onboarding, batches, fileCounts } = await asUser(async (tx) => {
    const { subscriptions: subs, onboarding_responses, content_batches, packages } = schema;
    const [subscriptions, [onboarding], batches] = await Promise.all([
      tx
        .select({ id: subs.id, status: subs.status, expires_at: subs.expires_at, package_name: packages.name })
        .from(subs)
        .innerJoin(packages, eq(packages.id, subs.package_id))
        .where(and(eq(subs.user_id, profile.id), inArray(subs.status, ["active", "paused", "expired"])))
        .orderBy(desc(subs.created_at)),
      tx
        .select({ completed: onboarding_responses.completed })
        .from(onboarding_responses)
        .where(eq(onboarding_responses.user_id, profile.id)),
      // RLS only returns published batches to clients.
      tx
        .select({ id: content_batches.id, title: content_batches.title, published_at: content_batches.published_at })
        .from(content_batches)
        .orderBy(desc(content_batches.published_at))
        .limit(3),
    ]);
    const fileCounts = await batchFileCounts(tx, batches.map((b) => b.id));
    return { subscriptions, onboarding, batches, fileCounts };
  });

  const firstName = profile.full_name?.split(" ")[0];
  const active = subscriptions.find((sub) => sub.status === "active");
  const current = active ?? subscriptions[0];

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
          <p className="mt-2 text-xl font-black">{current?.package_name ?? "None yet"}</p>
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
              const count = fileCounts.get(batch.id) ?? 0;
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
