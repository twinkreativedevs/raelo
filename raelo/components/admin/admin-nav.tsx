"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  Activity,
  BarChart3,
  FileText,
  Handshake,
  ImageIcon,
  LayoutDashboard,
  Package,
  Settings,
  ShoppingBag,
  Users,
  UsersRound,
} from "lucide-react";

import { cn } from "@/lib/utils";
import type { TeamRole } from "@/lib/db/types";
import { TEAM_ROLES } from "@/lib/roles";

type NavLink = { href: string; label: string; icon: typeof Users; roles: TeamRole[] };

const GROUPS: { title: string; links: NavLink[] }[] = [
  {
    title: "Workspace",
    links: [
      { href: "/admin", label: "Dashboard", icon: LayoutDashboard, roles: TEAM_ROLES },
      { href: "/admin/clients", label: "Clients", icon: Users, roles: TEAM_ROLES },
      { href: "/admin/content", label: "Content", icon: ImageIcon, roles: TEAM_ROLES },
    ],
  },
  {
    title: "Business",
    links: [
      { href: "/admin/orders", label: "Orders", icon: ShoppingBag, roles: ["admin"] },
      { href: "/admin/revenue", label: "Revenue", icon: BarChart3, roles: ["admin"] },
      { href: "/admin/invoices", label: "Invoices", icon: FileText, roles: ["admin"] },
      { href: "/admin/packages", label: "Packages", icon: Package, roles: ["admin"] },
      { href: "/admin/affiliates", label: "Affiliates", icon: Handshake, roles: ["admin"] },
    ],
  },
  {
    title: "Organization",
    links: [
      { href: "/admin/team", label: "Team", icon: UsersRound, roles: ["admin"] },
      { href: "/admin/activity", label: "Activity log", icon: Activity, roles: ["admin"] },
      { href: "/admin/settings", label: "Settings", icon: Settings, roles: ["admin"] },
    ],
  },
];

function useLinks(role: TeamRole) {
  return GROUPS.map((group) => ({
    ...group,
    links: group.links.filter((link) => link.roles.includes(role)),
  })).filter((group) => group.links.length);
}

function isActive(pathname: string, href: string) {
  return href === "/admin" ? pathname === "/admin" : pathname.startsWith(href);
}

/** Grouped sidebar navigation (large screens). */
export function AdminNav({ role }: { role: TeamRole }) {
  const pathname = usePathname();
  const groups = useLinks(role);

  return (
    <nav className="space-y-6">
      {groups.map((group) => (
        <div key={group.title}>
          <p className="mb-2 px-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/30">
            {group.title}
          </p>
          <div className="space-y-0.5">
            {group.links.map(({ href, label, icon: Icon }) => {
              const active = isActive(pathname, href);
              return (
                <Link
                  key={href}
                  href={href}
                  aria-current={active ? "page" : undefined}
                  className={cn(
                    "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm font-semibold transition",
                    active ? "bg-white/[0.08] text-white" : "text-white/55 hover:bg-white/[0.04] hover:text-white",
                  )}
                >
                  <span
                    className={cn(
                      "flex h-7 w-7 items-center justify-center rounded-lg transition",
                      active ? "bg-[#ed1c24] text-white" : "text-white/45 group-hover:text-white/80",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  {label}
                </Link>
              );
            })}
          </div>
        </div>
      ))}
    </nav>
  );
}

/** Horizontal scrolling navigation (small screens). */
export function AdminMobileNav({ role }: { role: TeamRole }) {
  const pathname = usePathname();
  const links = useLinks(role).flatMap((group) => group.links);

  return (
    <nav className="flex gap-1.5 overflow-x-auto px-4 pb-3 lg:hidden">
      {links.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "flex shrink-0 items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition",
              active ? "bg-[#ed1c24] text-white" : "bg-white/[0.06] text-white/65",
            )}
          >
            <Icon className="h-3.5 w-3.5" />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}
