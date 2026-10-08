import Link from "next/link";
import { Menu } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const NAV = [
  { href: "#how-it-works", label: "How It Works" },
  { href: "#work", label: "Our Work" },
  { href: "#packages", label: "Packages" },
  { href: "#faq", label: "FAQ" },
];

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-50 border-b border-black/[0.06] bg-white/90 backdrop-blur">
      <div className="mx-auto flex h-[72px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-6 lg:px-10">
        <Logo />

        <nav className="hidden items-center gap-8 md:flex">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="text-sm font-medium text-black/70 transition hover:text-[#080d16]">
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-2 sm:gap-3">
          <Link
            href="/auth/login"
            className="hidden rounded-full px-4 py-2.5 text-sm font-semibold text-[#080d16] transition hover:bg-black/5 sm:block"
          >
            Log in
          </Link>
          <a
            href="#packages"
            className="rounded-full bg-[#ed1c24] px-5 py-2.5 text-sm font-semibold text-white transition hover:bg-[#c9141b]"
          >
            Get Started
          </a>

          <details className="group relative md:hidden">
            <summary className="flex h-10 w-10 cursor-pointer list-none items-center justify-center rounded-full border border-black/10 [&::-webkit-details-marker]:hidden">
              <Menu className="h-5 w-5" />
              <span className="sr-only">Menu</span>
            </summary>
            <div className="absolute right-0 top-12 w-56 rounded-2xl border border-black/5 bg-white p-2 shadow-xl">
              {NAV.map((item) => (
                <a key={item.href} href={item.href} className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5">
                  {item.label}
                </a>
              ))}
              <Link href="/auth/login" className="block rounded-xl px-4 py-3 text-sm font-semibold hover:bg-black/5">
                Log in
              </Link>
            </div>
          </details>
        </div>
      </div>
    </header>
  );
}

export function SiteFooter() {
  return (
    <footer className="bg-[#080d16] text-white">
      <div className="mx-auto flex max-w-[1280px] flex-col gap-10 px-4 py-12 sm:px-6 lg:flex-row lg:items-center lg:justify-between lg:px-10">
        <div>
          <div className="[&_span:last-child]:text-white">
            <Logo />
          </div>
          <p className="mt-3 text-sm text-white/40">Better content. Stronger brands.</p>
        </div>

        <nav className="flex flex-wrap gap-x-6 gap-y-3 text-sm text-white/60">
          {NAV.map((item) => (
            <a key={item.href} href={item.href} className="hover:text-white">
              {item.label}
            </a>
          ))}
          <Link href="/affiliate" className="hover:text-white">Affiliates</Link>
          <Link href="/terms" className="hover:text-white">Terms</Link>
          <Link href="/privacy" className="hover:text-white">Privacy</Link>
          <Link href="/refunds" className="hover:text-white">Refunds</Link>
        </nav>

        <p className="text-xs text-white/30">
          © {new Date().getFullYear()} Twin Kreative Limited. All rights reserved.
        </p>
      </div>
    </footer>
  );
}
