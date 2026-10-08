import Link from "next/link";
import { ArrowUpRight, type LucideIcon } from "lucide-react";

import { cn } from "@/lib/utils";

export function AdminPageHeader({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children?: React.ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div>
        <h1 className="text-[28px] font-black leading-tight tracking-tight">{title}</h1>
        {description && <p className="mt-1 max-w-2xl text-sm text-black/55">{description}</p>}
      </div>
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

export function Panel({
  title,
  action,
  children,
  className,
}: {
  title?: string;
  action?: React.ReactNode;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("card p-5 sm:p-6", className)}>
      {(title || action) && (
        <div className="mb-5 flex items-center justify-between gap-4">
          {title && <h2 className="text-base font-black tracking-tight">{title}</h2>}
          {action}
        </div>
      )}
      {children}
    </section>
  );
}

export function StatCard({
  label,
  value,
  hint,
  href,
  icon: Icon,
  tone = "default",
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
  icon?: LucideIcon;
  /** "dark" for the headline number, "alert" for something needing action. */
  tone?: "default" | "dark" | "alert";
}) {
  const dark = tone === "dark";
  const body = (
    <>
      <div className="flex items-start justify-between gap-3">
        <p className={cn("text-xs font-bold uppercase tracking-[0.12em]", dark ? "text-white/50" : "text-black/40")}>{label}</p>
        {Icon && (
          <span
            className={cn(
              "flex h-9 w-9 shrink-0 items-center justify-center rounded-xl",
              dark ? "bg-[#ed1c24] text-white" : tone === "alert" ? "bg-amber-50 text-amber-600" : "bg-[#fdeced] text-[#ed1c24]",
            )}
          >
            <Icon className="h-[18px] w-[18px]" />
          </span>
        )}
      </div>
      <p className="mt-3 truncate text-[28px] font-black leading-none tracking-tight">{value}</p>
      {hint && (
        <p className={cn("mt-2 flex items-center gap-1 text-xs", dark ? "text-white/55" : "text-black/50")}>
          {hint}
          {href && <ArrowUpRight className="h-3.5 w-3.5 opacity-60" />}
        </p>
      )}
    </>
  );
  const className = cn(
    "block p-5",
    dark
      ? "relative overflow-hidden rounded-2xl bg-[#080d16] text-white shadow-sm"
      : tone === "alert"
        ? "rounded-2xl border border-amber-200 bg-white"
        : "card",
  );
  return href ? (
    <Link href={href} className={cn(className, "transition hover:-translate-y-0.5 hover:shadow-md")}>
      {body}
    </Link>
  ) : (
    <div className={className}>{body}</div>
  );
}

const BADGE_TONES: Record<string, string> = {
  active: "bg-green-50 text-green-700",
  paid: "bg-green-50 text-green-700",
  published: "bg-green-50 text-green-700",
  approved: "bg-green-50 text-green-700",
  pending: "bg-amber-50 text-amber-700",
  draft: "bg-amber-50 text-amber-700",
  paused: "bg-amber-50 text-amber-700",
  failed: "bg-red-50 text-red-700",
  cancelled: "bg-black/5 text-black/60",
  abandoned: "bg-black/5 text-black/60",
  expired: "bg-black/5 text-black/60",
  refunded: "bg-black/5 text-black/60",
  void: "bg-black/5 text-black/60",
  inactive: "bg-black/5 text-black/60",
};

export function StatusBadge({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1.5 rounded-full px-2.5 py-0.5 text-xs font-semibold capitalize",
        BADGE_TONES[status] ?? "bg-black/5 text-black/70",
      )}
    >
      <span aria-hidden className="h-1.5 w-1.5 rounded-full bg-current opacity-70" />
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto sm:-mx-6">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-y border-black/[0.06] bg-black/[0.02] px-5 py-2.5 text-[11px] font-bold uppercase tracking-[0.1em] text-black/45 sm:px-6", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-black/[0.05] px-5 py-3.5 align-middle sm:px-6", className)}>{children}</td>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return (
    <p className="rounded-xl border border-dashed border-black/10 px-6 py-10 text-center text-sm text-black/50">
      {children}
    </p>
  );
}

/** Prev/next links that keep the current filters in the query string. */
export function Pagination({
  page,
  pageSize,
  total,
  basePath,
  params,
}: {
  page: number;
  pageSize: number;
  total: number;
  basePath: string;
  params: Record<string, string | undefined>;
}) {
  const pages = Math.max(1, Math.ceil(total / pageSize));
  if (pages <= 1) return null;

  const href = (p: number) => {
    const query = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) if (value) query.set(key, value);
    query.set("page", String(p));
    return `${basePath}?${query}`;
  };

  return (
    <div className="mt-4 flex items-center justify-between text-sm">
      <span className="text-black/50">
        Page {page} of {pages} · {total} total
      </span>
      <div className="flex gap-2">
        {page > 1 && (
          <Link href={href(page - 1)} className="rounded-xl border border-black/10 bg-white px-3 py-1.5 font-semibold transition hover:bg-black/[0.03]">
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="rounded-xl border border-black/10 bg-white px-3 py-1.5 font-semibold transition hover:bg-black/[0.03]">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

export const inputClass =
  "h-10 rounded-xl border border-black/10 bg-white px-3 text-sm outline-none transition focus:border-[#ed1c24] focus:ring-4 focus:ring-[#ed1c24]/10";
