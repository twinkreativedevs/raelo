import Link from "next/link";

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
        <h1 className="text-2xl font-black tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-sm text-black/60">{description}</p>}
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
    <section className={cn("rounded-2xl bg-white p-5 shadow-sm", className)}>
      {(title || action) && (
        <div className="mb-4 flex items-center justify-between gap-4">
          {title && <h2 className="font-bold">{title}</h2>}
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
}: {
  label: string;
  value: string | number;
  hint?: string;
  href?: string;
}) {
  const body = (
    <>
      <p className="text-xs font-bold uppercase tracking-widest text-black/40">{label}</p>
      <p className="mt-2 text-2xl font-black">{value}</p>
      {hint && <p className="mt-1 text-xs text-black/50">{hint}</p>}
    </>
  );
  const className = "block rounded-2xl bg-white p-5 shadow-sm";
  return href ? (
    <Link href={href} className={cn(className, "transition hover:shadow-md")}>
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
        "inline-block rounded-full px-2 py-0.5 text-xs font-semibold capitalize",
        BADGE_TONES[status] ?? "bg-black/5 text-black/70",
      )}
    >
      {status.replace(/_/g, " ")}
    </span>
  );
}

export function Table({ children }: { children: React.ReactNode }) {
  return (
    <div className="-mx-5 overflow-x-auto">
      <table className="w-full min-w-[640px] text-left text-sm">{children}</table>
    </div>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <th className={cn("border-b border-black/5 px-5 py-2 text-xs font-bold uppercase tracking-wider text-black/40", className)}>
      {children}
    </th>
  );
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <td className={cn("border-b border-black/5 px-5 py-3 align-middle", className)}>{children}</td>;
}

export function EmptyState({ children }: { children: React.ReactNode }) {
  return <p className="py-8 text-center text-sm text-black/50">{children}</p>;
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
          <Link href={href(page - 1)} className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold">
            ← Previous
          </Link>
        )}
        {page < pages && (
          <Link href={href(page + 1)} className="rounded-lg border border-black/10 px-3 py-1.5 font-semibold">
            Next →
          </Link>
        )}
      </div>
    </div>
  );
}

export const inputClass =
  "h-9 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#ed1c24]";
