import Link from "next/link";
import { LifeBuoy } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { getSettingValue } from "@/lib/settings";
import { Logo } from "@/components/brand/logo";
import { Avatar } from "@/components/app/avatar";
import { SignOutButton } from "@/components/app/sign-out-button";
import { PortalNav, PortalTabBar } from "@/components/portal/portal-nav";

export default async function PortalLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const [{ profile }, brand] = await Promise.all([
    requireProfile("/portal"),
    getSettingValue<{ support_email?: string }>("brand"),
  ]);
  const supportEmail =
    brand.support_email || process.env.EMAIL_FROM || "hello@helloraelo.com";
  const name = profile.full_name || profile.email;
  const subtitle =
    profile.account_type === "organization"
      ? profile.company_name || "Organization"
      : "Individual";

  return (
    <div className="min-h-screen bg-[#f6f6f7] text-[#080d16] lg:flex">
      <aside className="hidden w-[260px] shrink-0 border-r border-black/[0.06] bg-white lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
          <div className="px-2">
            <Logo href="/portal" />
          </div>

          <p className="mb-2 mt-8 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-black/35">
            Menu
          </p>
          <PortalNav />

          <div className="mt-auto space-y-4">
            <div className="rounded-2xl bg-[#080d16] p-4 text-white">
              <LifeBuoy className="h-5 w-5 text-[#ed1c24]" />
              <p className="mt-3 text-sm font-bold">Need a hand?</p>
              <p className="mt-1 text-xs leading-relaxed text-white/60">
                Questions about your content or plan? We reply within a working day.
              </p>
              <Link
                href={`mailto:${supportEmail}`}
                className="mt-3 inline-block break-all text-xs font-bold text-white underline underline-offset-4"
              >
                {supportEmail}
              </Link>
            </div>

            <div className="flex items-center gap-3 rounded-2xl border border-black/[0.06] p-2.5">
              <Avatar name={name} />
              <Link href="/portal/account" className="min-w-0 flex-1">
                <p className="truncate text-sm font-bold">{name}</p>
                <p className="truncate text-xs text-black/45">{subtitle}</p>
              </Link>
              <SignOutButton className="text-black/40 hover:bg-black/5 hover:text-black" />
            </div>
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        <header className="sticky top-0 z-20 flex h-16 items-center justify-between border-b border-black/[0.06] bg-white/90 px-4 backdrop-blur lg:hidden">
          <Logo href="/portal" />
          <div className="flex items-center gap-1">
            <Link href="/portal/account" aria-label="Account">
              <Avatar name={name} className="h-8 w-8" />
            </Link>
            <SignOutButton className="text-black/40 hover:bg-black/5 hover:text-black" />
          </div>
        </header>

        <main className="mx-auto max-w-6xl px-4 pb-28 pt-6 sm:px-6 lg:px-10 lg:pb-12 lg:pt-10">
          {children}
        </main>
      </div>

      <PortalTabBar />
    </div>
  );
}
