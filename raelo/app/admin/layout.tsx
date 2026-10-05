import type { Metadata } from "next";

import { requireStaff } from "@/lib/auth";
import type { TeamRole } from "@/lib/db/types";
import { AdminNav } from "@/components/admin/admin-nav";
import { LogoutButton } from "@/components/logout-button";

export const metadata: Metadata = {
  title: { default: "Raelo Admin", template: "%s · Raelo Admin" },
  robots: { index: false },
};

const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  account_manager: "Account manager",
  designer: "Designer",
};

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const { profile } = await requireStaff("/admin");
  const role = profile.role as TeamRole;

  return (
    <div className="min-h-screen bg-[#f4f4f5] text-[#111827] lg:flex">
      <aside className="bg-[#080d16] text-white lg:w-60 lg:shrink-0">
        <div className="px-4 py-4 lg:sticky lg:top-0 lg:flex lg:h-screen lg:flex-col lg:py-6">
        <div className="mb-4 flex items-center justify-between lg:mb-8 lg:block">
          <div className="flex items-center gap-2 px-2">
            <span className="flex h-8 w-8 items-center justify-center rounded-md bg-[#ed1c24] text-lg font-black">
              R
            </span>
            <span className="font-bold">Raelo Admin</span>
          </div>
        </div>
        <AdminNav role={role} />
        <div className="mt-4 hidden border-t border-white/10 px-2 pt-4 text-xs text-white/50 lg:mt-auto lg:block">
          <p className="font-semibold text-white/80">{profile.full_name ?? profile.email}</p>
          <p>{ROLE_LABELS[role]}</p>
        </div>
        </div>
      </aside>
      <div className="min-w-0 flex-1">
        <header className="flex h-14 items-center justify-end gap-3 border-b border-black/5 bg-white px-6">
          <span className="text-sm text-black/50 lg:hidden">{ROLE_LABELS[role]}</span>
          <LogoutButton />
        </header>
        <main className="mx-auto max-w-6xl space-y-6 px-6 py-8">{children}</main>
      </div>
    </div>
  );
}
