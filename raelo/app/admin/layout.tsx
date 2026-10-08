import type { Metadata } from "next";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import type { TeamRole } from "@/lib/db/types";
import { ROLE_LABELS } from "@/lib/roles";
import { Avatar } from "@/components/app/avatar";
import { SignOutButton } from "@/components/app/sign-out-button";
import { AdminMobileNav, AdminNav } from "@/components/admin/admin-nav";
import { SearchBox } from "@/components/admin/search-box";

export const metadata: Metadata = {
  title: { default: "Raelo Admin", template: "%s · Raelo Admin" },
  robots: { index: false },
};

function Brand() {
  return (
    <Link href="/admin" className="flex items-center gap-2.5">
      <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-[#ed1c24] text-lg font-black text-white">
        R
      </span>
      <span className="leading-tight">
        <span className="block font-black tracking-tight text-white">Raelo</span>
        <span className="block text-[11px] font-semibold uppercase tracking-[0.16em] text-white/40">Compass</span>
      </span>
    </Link>
  );
}

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff("/admin");
  const role = profile.role as TeamRole;
  const name = profile.full_name || profile.email;
  const today = new Intl.DateTimeFormat("en-GB", {
    weekday: "long",
    day: "numeric",
    month: "long",
    timeZone: "Africa/Lagos",
  }).format(new Date());

  return (
    <div className="min-h-screen bg-[#f4f4f6] text-[#080d16] lg:flex">
      <aside className="hidden w-[264px] shrink-0 bg-[#080d16] lg:block">
        <div className="sticky top-0 flex h-screen flex-col px-4 py-6">
          <div className="px-2">
            <Brand />
          </div>
          <div className="mt-8 flex-1 overflow-y-auto">
            <AdminNav role={role} />
          </div>
          <div className="mt-4 flex items-center gap-3 rounded-2xl bg-white/[0.05] p-2.5">
            <Avatar name={name} />
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-bold text-white">{name}</p>
              <p className="truncate text-xs text-white/45">{ROLE_LABELS[role]}</p>
            </div>
            <SignOutButton redirectTo="/compass" className="text-white/45 hover:bg-white/10 hover:text-white" />
          </div>
        </div>
      </aside>

      <div className="min-w-0 flex-1">
        {/* Phones and tablets */}
        <header className="sticky top-0 z-20 bg-[#080d16] lg:hidden">
          <div className="flex h-16 items-center justify-between px-4">
            <Brand />
            <div className="flex items-center gap-1">
              <Avatar name={name} className="h-8 w-8" />
              <SignOutButton redirectTo="/compass" className="text-white/50 hover:bg-white/10 hover:text-white" />
            </div>
          </div>
          <AdminMobileNav role={role} />
        </header>

        {/* Desktop top bar */}
        <header className="sticky top-0 z-20 hidden h-16 items-center gap-6 border-b border-black/[0.06] bg-white/90 px-10 backdrop-blur lg:flex">
          <SearchBox />
          <div className="ml-auto text-right text-sm">
            <p className="font-semibold">{today}</p>
            <p className="text-xs text-black/45">Signed in as {ROLE_LABELS[role].toLowerCase()}</p>
          </div>
        </header>

        <main className="mx-auto max-w-7xl space-y-6 px-4 py-6 sm:px-6 lg:px-10 lg:py-8">{children}</main>
      </div>
    </div>
  );
}
