"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  CreditCard,
  ImageIcon,
  LayoutDashboard,
  Palette,
  UserRound,
} from "lucide-react";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/portal", label: "Overview", icon: LayoutDashboard },
  { href: "/portal/content", label: "Content", icon: ImageIcon },
  { href: "/portal/brand", label: "Brand", icon: Palette },
  { href: "/portal/billing", label: "Billing", icon: CreditCard },
  { href: "/portal/account", label: "Account", icon: UserRound },
];

function isActive(pathname: string, href: string) {
  return href === "/portal" ? pathname === "/portal" : pathname.startsWith(href);
}

/** Sidebar links on large screens. */
export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="space-y-1">
      {LINKS.map(({ href, label, icon: Icon }) => {
        const active = isActive(pathname, href);
        return (
          <Link
            key={href}
            href={href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "group flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition",
              active
                ? "bg-[#080d16] text-white shadow-sm"
                : "text-black/55 hover:bg-black/[0.04] hover:text-[#080d16]",
            )}
          >
            <Icon
              className={cn(
                "h-[18px] w-[18px]",
                active ? "text-[#ed1c24]" : "text-black/35 group-hover:text-black/60",
              )}
            />
            {label}
          </Link>
        );
      })}
    </nav>
  );
}

/** Bottom tab bar on phones. */
export function PortalTabBar() {
  const pathname = usePathname();

  return (
    <nav className="fixed inset-x-0 bottom-0 z-30 border-t border-black/[0.06] bg-white/95 pb-[env(safe-area-inset-bottom)] backdrop-blur lg:hidden">
      <div className="mx-auto grid max-w-md grid-cols-5">
        {LINKS.map(({ href, label, icon: Icon }) => {
          const active = isActive(pathname, href);
          return (
            <Link
              key={href}
              href={href}
              aria-current={active ? "page" : undefined}
              className={cn(
                "flex flex-col items-center gap-1 py-2.5 text-[11px] font-semibold",
                active ? "text-[#ed1c24]" : "text-black/45",
              )}
            >
              <Icon className="h-5 w-5" />
              {label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
