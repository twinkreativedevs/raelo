"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";

import { cn } from "@/lib/utils";

const LINKS = [
  { href: "/portal", label: "Overview" },
  { href: "/portal/content", label: "Content" },
  { href: "/portal/brand", label: "Brand" },
  { href: "/portal/billing", label: "Billing" },
  { href: "/portal/account", label: "Account" },
];

export function PortalNav() {
  const pathname = usePathname();

  return (
    <nav className="-mb-px flex gap-6 overflow-x-auto text-sm font-semibold">
      {LINKS.map((link) => {
        const active =
          link.href === "/portal"
            ? pathname === "/portal"
            : pathname.startsWith(link.href);
        return (
          <Link
            key={link.href}
            href={link.href}
            aria-current={active ? "page" : undefined}
            className={cn(
              "shrink-0 border-b-2 pb-3 transition-colors",
              active
                ? "border-[#ed1c24] text-black"
                : "border-transparent text-black/50 hover:text-black",
            )}
          >
            {link.label}
          </Link>
        );
      })}
    </nav>
  );
}
