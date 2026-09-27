"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/supabase/database.types";

const LINKS: { href: string; label: string; roles: TeamRole[] }[] = [
  { href: "/admin", label: "Dashboard", roles: ["admin", "account_manager", "designer"] },
  { href: "/admin/orders", label: "Orders", roles: ["admin"] },
  { href: "/admin/clients", label: "Clients", roles: ["admin", "account_manager", "designer"] },
  { href: "/admin/content", label: "Content", roles: ["admin", "account_manager", "designer"] },
  { href: "/admin/packages", label: "Packages", roles: ["admin"] },
  { href: "/admin/revenue", label: "Revenue", roles: ["admin"] },
  { href: "/admin/invoices", label: "Invoices", roles: ["admin"] },
  { href: "/admin/affiliates", label: "Affiliates", roles: ["admin"] },
  { href: "/admin/team", label: "Team", roles: ["admin"] },
  { href: "/admin/activity", label: "Activity log", roles: ["admin"] },
  { href: "/admin/settings", label: "Settings", roles: ["admin"] },
];

export function AdminNav({ role }: { role: TeamRole }) {
  const pathname = usePathname();

  return (
    <nav className="flex gap-1 overflow-x-auto text-sm font-semibold lg:flex-col">
      {LINKS.filter((link) => link.roles.includes(role)).map((link) => {
        const active =
          link.href === "/admin" ? pathname === "/admin" : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 rounded-lg px-3 py-2 transition-colors",
              active ? "bg-[#ed1c24] text-white" : "text-white/60 hover:bg-white/5 hover:text-white",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
