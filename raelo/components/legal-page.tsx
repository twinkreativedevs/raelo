import Link from "next/link";

import { Logo } from "@/components/brand/logo";
import { getSettingValue } from "@/lib/settings";

export const LEGAL_UPDATED = "5 October 2026";

/** Contact email for legal pages: Admin → Settings → Brand → support email. */
export async function supportEmail() {
  try {
    const brand = await getSettingValue<{ support_email?: string }>("brand");
    return brand.support_email || "hello@twinkreative.co";
  } catch {
    return "hello@twinkreative.co";
  }
}

export function LegalPage({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="min-h-screen bg-white text-[#111827]">
      <header className="border-b border-black/5">
        <div className="mx-auto flex h-16 max-w-3xl items-center justify-between px-6">
          <Logo />
          <nav className="flex gap-4 text-sm text-black/60">
            <Link href="/terms">Terms</Link>
            <Link href="/privacy">Privacy</Link>
            <Link href="/refunds">Refunds</Link>
          </nav>
        </div>
      </header>
      <main className="mx-auto max-w-3xl px-6 py-14">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[#ed1c24]">Legal</p>
        <h1 className="mt-3 text-4xl font-black tracking-tight">{title}</h1>
        <p className="mt-2 text-sm text-black/50">Last updated {LEGAL_UPDATED}</p>
        <div className="legal mt-10 space-y-5 text-[15px] leading-7 text-black/75 [&_h2]:mt-10 [&_h2]:text-xl [&_h2]:font-bold [&_h2]:text-black [&_li]:ml-5 [&_li]:list-disc [&_a]:text-[#ed1c24] [&_a]:underline">
          {children}
        </div>
      </main>
    </div>
  );
}
