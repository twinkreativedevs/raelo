export function SearchBox({ defaultValue = "" }: { defaultValue?: string }) {
  return (
    <form action="/admin/search" className="flex w-full max-w-md gap-2">
      <input
        name="q"
        defaultValue={defaultValue}
        placeholder="Search clients, emails, orders, invoices…"
        aria-label="Search"
        className="h-10 flex-1 rounded-lg border border-black/10 bg-white px-3 text-sm outline-none focus:border-[#ed1c24]"
      />
      <button className="h-10 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Search</button>
    </form>
  );
}
