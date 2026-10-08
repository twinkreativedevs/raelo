import { and, desc, eq, inArray } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { redirect } from "next/navigation";
import {
  ArrowRight,
  ArrowUpRight,
  Building2,
  CalendarClock,
  Check,
  FileImage,
  Layers,
  Palette,
  Sparkles,
  User,
} from "lucide-react";

import { isStaffRole, requireProfile } from "@/lib/auth";
import { batchFileCounts } from "@/lib/content";
import { schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { cn } from "@/lib/utils";

export const metadata: Metadata = { title: "Overview" };

const DAY = 24 * 60 * 60 * 1000;

/** Whole days from now until `date` (never negative). */
function daysUntil(date: string) {
  return Math.max(0, Math.ceil((new Date(date).getTime() - Date.now()) / DAY));
}

function greeting() {
  const hour = Number(
    new Intl.DateTimeFormat("en-GB", { hour: "numeric", hourCycle: "h23", timeZone: "Africa/Lagos" }).format(new Date()),
  );
  if (hour < 12) return "Good morning";
  if (hour < 17) return "Good afternoon";
  return "Good evening";
}

export default async function PortalHome() {
  const { asUser, profile } = await requireProfile("/portal");

  // Login lands on /portal by default; the team works in /admin.
  if (isStaffRole(profile.role)) redirect("/admin");

  const { subscriptions, onboarding, batches, fileCounts } = await asUser(async (tx) => {
    const { subscriptions: subs, onboarding_responses, content_batches, packages } = schema;
    const [subscriptions, [onboarding], batches] = await Promise.all([
      tx
        .select({ id: subs.id, status: subs.status, expires_at: subs.expires_at, auto_renew: subs.auto_renew, package_name: packages.name })
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
        .orderBy(desc(content_batches.published_at)),
    ]);
    const fileCounts = await batchFileCounts(tx, batches.map((b) => b.id));
    return { subscriptions, onboarding, batches, fileCounts };
  });

  const firstName = profile.full_name?.split(" ")[0];
  const isOrg = profile.account_type === "organization";
  const active = subscriptions.find((sub) => sub.status === "active");
  const current = active ?? subscriptions[0];
  const briefDone = Boolean(onboarding?.completed);
  const totalFiles = [...fileCounts.values()].reduce((sum, n) => sum + n, 0);
  const daysLeft = current?.expires_at ? daysUntil(current.expires_at) : null;
  const profileDone = Boolean(
    profile.full_name && profile.phone && (!isOrg || profile.company_name),
  );

  const steps = [
    { label: "Create your account", done: true, href: "/portal/account" },
    { label: "Complete your profile", done: profileDone, href: "/portal/account" },
    { label: "Choose a plan", done: Boolean(active), href: "/#packages" },
    { label: "Share your brand brief", done: briefDone, href: briefDone ? "/portal/brand" : "/onboarding" },
    { label: "Receive your first content", done: batches.length > 0, href: "/portal/content" },
  ];
  const doneCount = steps.filter((s) => s.done).length;
  const progress = Math.round((doneCount / steps.length) * 100);

  return (
    <div className="space-y-6">
      {/* Welcome */}
      <section className="relative overflow-hidden rounded-3xl bg-[#080d16] p-6 text-white sm:p-8">
        <div aria-hidden className="absolute -right-16 -top-20 h-40 w-40 rounded-full bg-[#ed1c24] opacity-90 sm:-right-20 sm:-top-24 sm:h-72 sm:w-72" />
        <div aria-hidden className="absolute -bottom-32 right-40 h-64 w-64 rounded-full border-[36px] border-white/[0.04]" />
        <div className="relative max-w-xl">
          <span className="inline-flex items-center gap-1.5 rounded-full bg-white/10 px-3 py-1 text-xs font-semibold text-white/80">
            {isOrg ? <Building2 className="h-3.5 w-3.5" /> : <User className="h-3.5 w-3.5" />}
            {isOrg ? profile.company_name || "Organization" : "Individual account"}
          </span>
          <h1 className="mt-4 text-3xl font-black tracking-tight sm:text-4xl">
            {greeting()}{firstName ? `, ${firstName}` : ""}.
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-white/65 sm:text-base">
            {active
              ? "Here's everything happening with your brand's content."
              : "Pick a plan and share your brand, and we'll start creating your content."}
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            {active ? (
              <Link href="/portal/content" className="btn-primary">
                View content <ArrowRight className="h-4 w-4" />
              </Link>
            ) : (
              <Link href="/#packages" className="btn-primary">
                Choose a plan <ArrowRight className="h-4 w-4" />
              </Link>
            )}
            <Link
              href={briefDone ? "/portal/brand" : "/onboarding"}
              className="inline-flex h-10 items-center gap-2 rounded-xl bg-white/10 px-4 text-sm font-bold text-white transition hover:bg-white/15"
            >
              {briefDone ? "Edit brand brief" : "Start brand brief"}
            </Link>
          </div>
        </div>
      </section>

      {current && !briefDone && (
        <Link
          href="/onboarding"
          className="flex items-center gap-4 rounded-2xl border border-[#ed1c24]/20 bg-[#fdeced] p-4 transition hover:border-[#ed1c24]/40"
        >
          <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#ed1c24] text-white">
            <Sparkles className="h-5 w-5" />
          </span>
          <span className="flex-1 text-sm">
            <span className="font-bold">We&apos;re waiting on your brand brief.</span>{" "}
            <span className="text-black/60">It takes about 5 minutes, then we can start creating.</span>
          </span>
          <ArrowRight className="h-4 w-4 shrink-0 text-[#ed1c24]" />
        </Link>
      )}

      {/* Stats */}
      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4 lg:gap-4">
        <Stat
          icon={Layers}
          label="Plan"
          value={current?.package_name ?? "None yet"}
          hint={current ? <span className="capitalize">{current.status}</span> : "Not subscribed"}
        />
        <Stat
          icon={CalendarClock}
          label={current?.auto_renew && current.status === "active" ? "Renews in" : "Ends in"}
          value={daysLeft === null ? "—" : `${daysLeft} day${daysLeft === 1 ? "" : "s"}`}
          hint={current?.expires_at ? formatDate(current.expires_at) : "No active plan"}
        />
        <Stat
          icon={FileImage}
          label="Batches delivered"
          value={String(batches.length)}
          hint={batches[0] ? `Latest ${formatDate(batches[0].published_at)}` : "None yet"}
        />
        <Stat
          icon={Palette}
          label="Files ready"
          value={String(totalFiles)}
          hint="Posts, videos and carousels"
        />
      </section>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        {/* Latest content */}
        <section className="card p-5 sm:p-6">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-lg font-black tracking-tight">Latest content</h2>
              <p className="text-sm text-black/50">Ready to download and post.</p>
            </div>
            <Link href="/portal/content" className="inline-flex items-center gap-1 text-sm font-bold text-[#ed1c24]">
              View all <ArrowUpRight className="h-4 w-4" />
            </Link>
          </div>

          {batches.length ? (
            <ul className="mt-5 space-y-2">
              {batches.slice(0, 5).map((batch, i) => {
                const count = fileCounts.get(batch.id) ?? 0;
                return (
                  <li key={batch.id}>
                    <Link
                      href={`/portal/content/${batch.id}`}
                      className="group flex items-center gap-4 rounded-xl border border-transparent p-3 transition hover:border-black/[0.06] hover:bg-black/[0.02]"
                    >
                      <span
                        className={cn(
                          "flex h-12 w-12 shrink-0 items-center justify-center rounded-xl text-sm font-black",
                          i === 0 ? "bg-[#ed1c24] text-white" : "bg-[#080d16] text-white",
                        )}
                      >
                        {count}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate font-bold group-hover:text-[#ed1c24]">{batch.title}</span>
                        <span className="text-xs text-black/50">
                          {count} file{count === 1 ? "" : "s"} · delivered {formatDate(batch.published_at)}
                        </span>
                      </span>
                      {i === 0 && (
                        <span className="hidden rounded-full bg-green-50 px-2.5 py-1 text-xs font-bold text-green-700 sm:inline">
                          New
                        </span>
                      )}
                      <ArrowRight className="h-4 w-4 shrink-0 text-black/25 transition group-hover:translate-x-0.5 group-hover:text-[#ed1c24]" />
                    </Link>
                  </li>
                );
              })}
            </ul>
          ) : (
            <div className="mt-5 flex flex-col items-center rounded-2xl border border-dashed border-black/10 px-6 py-12 text-center">
              <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-black/[0.04]">
                <FileImage className="h-6 w-6 text-black/35" />
              </span>
              <p className="mt-4 font-bold">Nothing delivered yet</p>
              <p className="mt-1 max-w-xs text-sm text-black/50">
                {active
                  ? "Your first batch is on its way. We'll email you the moment it's ready."
                  : "Once you're on a plan, your designed posts will appear here every month."}
              </p>
            </div>
          )}
        </section>

        <div className="space-y-6">
          {/* Setup progress */}
          <section className="card p-5 sm:p-6">
            <div className="flex items-baseline justify-between">
              <h2 className="text-lg font-black tracking-tight">Getting set up</h2>
              <span className="text-sm font-bold text-[#ed1c24]">{progress}%</span>
            </div>
            <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/[0.06]">
              <div className="h-full rounded-full bg-[#ed1c24] transition-all" style={{ width: `${progress}%` }} />
            </div>
            <ul className="mt-5 space-y-1">
              {steps.map((step) => (
                <li key={step.label}>
                  <Link
                    href={step.href}
                    className="flex items-center gap-3 rounded-lg px-1 py-1.5 text-sm transition hover:bg-black/[0.03]"
                  >
                    <span
                      className={cn(
                        "flex h-6 w-6 shrink-0 items-center justify-center rounded-full",
                        step.done ? "bg-[#080d16] text-white" : "border-2 border-black/15",
                      )}
                    >
                      {step.done && <Check className="h-3.5 w-3.5" strokeWidth={3} />}
                    </span>
                    <span className={step.done ? "text-black/45 line-through decoration-black/20" : "font-semibold"}>
                      {step.label}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          </section>

          {/* Plan */}
          <section className="card p-5 sm:p-6">
            <p className="text-xs font-bold uppercase tracking-[0.14em] text-black/40">Your plan</p>
            <p className="mt-2 text-2xl font-black tracking-tight">{current?.package_name ?? "No plan yet"}</p>
            <p className="mt-1 text-sm text-black/55">
              {current
                ? `${current.status === "active" ? "Active" : current.status[0].toUpperCase() + current.status.slice(1)} · ${current.auto_renew && current.status === "active" ? "renews" : "until"} ${formatDate(current.expires_at)}`
                : "Pick a package to get started."}
            </p>
            <Link href={current ? "/portal/billing" : "/#packages"} className="btn-ghost mt-5 w-full">
              {current ? "Manage billing" : "View packages"}
            </Link>
          </section>
        </div>
      </div>
    </div>
  );
}

function Stat({
  icon: Icon,
  label,
  value,
  hint,
}: {
  icon: typeof Layers;
  label: string;
  value: string;
  hint: React.ReactNode;
}) {
  return (
    <div className="card p-4 sm:p-5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#fdeced] text-[#ed1c24]">
        <Icon className="h-[18px] w-[18px]" />
      </span>
      <p className="mt-4 text-xs font-semibold text-black/45">{label}</p>
      <p className="mt-0.5 truncate text-xl font-black tracking-tight">{value}</p>
      <p className="mt-0.5 truncate text-xs text-black/45">{hint}</p>
    </div>
  );
}
