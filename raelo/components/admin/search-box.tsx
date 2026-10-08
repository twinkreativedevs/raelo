import { Search } from "lucide-react";

import { cn } from "@/lib/utils";

export function SearchBox({
  defaultValue = "",
  className,
}: {
  defaultValue?: string;
  className?: string;
}) {
  return (
    <form action="/admin/search" role="search" className={cn("relative w-full max-w-md", className)}>
      <Search className="pointer-events-none absolute left-3.5 top-1/2 h-4 w-4 -translate-y-1/2 text-black/35" />
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search clients, emails, orders, invoices…"
        aria-label="Search"
        className="h-10 w-full rounded-xl border border-black/[0.08] bg-black/[0.03] pl-10 pr-3 text-sm outline-none transition placeholder:text-black/40 focus:border-[#ed1c24] focus:bg-white focus:ring-4 focus:ring-[#ed1c24]/10"
      />
    </form>
  );
}
