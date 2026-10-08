import { Check } from "lucide-react";

import { Logo } from "@/components/brand/logo";

const POINTS = [
  "Designed posts and captions, made for your brand",
  "New content every month in your private portal",
  "Download, post and keep showing up",
];

/**
 * Split layout for the sign-up and login pages: a dark brand panel on large
 * screens, and the form on white. On phones only the form shows.
 */
export function AuthShell({
  title,
  subtitle,
  children,
}: {
  title: string;
  subtitle?: React.ReactNode;
  children: React.ReactNode;
}) {
  return (
    <div className="grid min-h-svh bg-white lg:grid-cols-[minmax(0,5fr)_minmax(0,6fr)]">
      <aside className="relative hidden overflow-hidden bg-[#080d16] p-12 text-white lg:flex lg:flex-col lg:justify-between">
        <div
          aria-hidden
          className="absolute -right-32 -top-32 h-96 w-96 rounded-full bg-[#ed1c24] opacity-90 blur-[2px]"
        />
        <div
          aria-hidden
          className="absolute -bottom-40 -left-24 h-80 w-80 rounded-full border-[40px] border-white/5"
        />

        <div className="relative [&_span:last-child]:text-white">
          <Logo />
        </div>

        <div className="relative max-w-md">
          <h2 className="text-4xl font-black leading-tight tracking-tight">
            Content that keeps your brand showing up.
          </h2>
          <ul className="mt-8 space-y-4">
            {POINTS.map((point) => (
              <li key={point} className="flex items-start gap-3 text-white/80">
                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-[#ed1c24]">
                  <Check className="h-3 w-3" strokeWidth={3} />
                </span>
                {point}
              </li>
            ))}
          </ul>
        </div>

        <p className="relative text-sm text-white/40">
          © {new Date().getFullYear()} Raelo
        </p>
      </aside>

      <main className="flex flex-col px-4 py-8 sm:px-8">
        <div className="lg:hidden">
          <Logo />
        </div>
        <div className="flex flex-1 items-center justify-center py-10">
          <div className="w-full max-w-[420px]">
            <h1 className="text-3xl font-black tracking-tight text-[#080d16]">
              {title}
            </h1>
            {subtitle && (
              <p className="mt-2 text-sm text-black/55">{subtitle}</p>
            )}
            <div className="mt-8">{children}</div>
          </div>
        </div>
      </main>
    </div>
  );
}

/** Shared field styling for the auth forms. */
export const authInputClass =
  "h-11 w-full rounded-xl border border-black/15 bg-white px-3.5 text-[15px] text-[#080d16] shadow-sm outline-none transition placeholder:text-black/35 focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10 disabled:opacity-60";

export const authLabelClass = "mb-1.5 block text-sm font-semibold text-[#080d16]";

export const authPrimaryButtonClass =
  "flex h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#ed1c24] text-[15px] font-bold text-white shadow-sm transition hover:bg-[#d4171f] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#ed1c24]/25 disabled:cursor-not-allowed disabled:opacity-60";
