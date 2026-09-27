import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { ilikePattern } from "@/lib/admin/search";
import { formatDate } from "@/lib/format";
import { AdminPageHeader, EmptyState, Pagination, Panel, StatusBadge, Table, Td, Th, inputClass } from "@/components/admin/ui";

export const metadata = { title: "Clients" };

const PAGE_SIZE = 25;
const FILTERS = {
  no_brief: "Waiting on brand brief",
  failed_renewal: "Failed renewal",
} as const;

export default async function ClientsPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase, profile } = await requireStaff("/admin/clients");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 50) || undefined;
  const term = ilikePattern(q);
  const filter = params.filter && params.filter in FILTERS ? (params.filter as keyof typeof FILTERS) : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  // Pre-compute the user ids a filter narrows to.
  let onlyIds: string[] | null = null;
  if (filter === "failed_renewal") {
    const { data } = await supabase.from("subscriptions").select("user_id").eq("status", "active").gt("renewal_failures", 0);
    onlyIds = [...new Set((data ?? []).map((s) => s.user_id))];
  } else if (filter === "no_brief") {
    const [{ data: subs }, { data: briefs }] = await Promise.all([
      supabase.from("subscriptions").select("user_id").eq("status", "active"),
      supabase.from("onboarding_responses").select("user_id").eq("completed", true),
    ]);
    const done = new Set((briefs ?? []).map((b) => b.user_id));
    onlyIds = [...new Set((subs ?? []).map((s) => s.user_id).filter((id) => !done.has(id)))];
  }

  // RLS: team members only get the clients assigned to them.
  let query = supabase
    .from("profiles")
    .select("id, full_name, email, phone, company_name, created_at", { count: "exact" })
    .eq("role", "client");
  if (term) query = query.or(`full_name.ilike.${term},email.ilike.${term},company_name.ilike.${term},phone.ilike.${term}`);
  if (onlyIds) query = query.in("id", onlyIds.length ? onlyIds : ["00000000-0000-0000-0000-000000000000"]);

  const { data: clients, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  const ids = (clients ?? []).map((c) => c.id);
  const [{ data: subs }, { data: briefs }] = ids.length
    ? await Promise.all([
        supabase.from("subscriptions").select("user_id, status, expires_at, created_at, packages(name)").in("user_id", ids).neq("status", "pending").order("created_at", { ascending: false }),
        supabase.from("onboarding_responses").select("user_id, completed").in("user_id", ids),
      ])
    : [{ data: [] }, { data: [] }];

  const latestSub = (id: string) => subs?.find((s) => s.user_id === id);
  const briefDone = new Set((briefs ?? []).filter((b) => b.completed).map((b) => b.user_id));

  return (
    <>
      <AdminPageHeader
        title="Clients"
        description={profile.role === "admin" ? "Everyone with a client account." : "Clients assigned to you."}
      />

      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder="Name, email, company, phone" className={inputClass} aria-label="Search clients" />
        <select name="filter" defaultValue={filter ?? ""} className={inputClass} aria-label="Filter">
          <option value="">All clients</option>
          {Object.entries(FILTERS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
        </select>
        <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Filter</button>
        <Link href="/admin/clients" className="h-9 px-2 text-sm leading-9 text-black/50">Reset</Link>
      </form>

      <Panel>
        {clients?.length ? (
          <>
            <Table>
              <thead>
                <tr><Th>Client</Th><Th>Contact</Th><Th>Package</Th><Th>Subscription</Th><Th>Brief</Th><Th>Joined</Th></tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const sub = latestSub(c.id);
                  const pkg = sub?.packages as unknown as { name: string } | null;
                  return (
                    <tr key={c.id}>
                      <Td>
                        <Link href={`/admin/clients/${c.id}`} className="font-semibold hover:text-[#ed1c24]">
                          {c.company_name || c.full_name || c.email}
                        </Link>
                        {c.company_name && <span className="block text-xs text-black/50">{c.full_name}</span>}
                      </Td>
                      <Td className="text-black/70">{c.email}<span className="block text-xs text-black/50">{c.phone}</span></Td>
                      <Td>{pkg?.name ?? "—"}</Td>
                      <Td>{sub ? <StatusBadge status={sub.status} /> : <span className="text-black/40">None</span>}</Td>
                      <Td>{briefDone.has(c.id) ? "Complete" : <span className="text-amber-700">Waiting</span>}</Td>
                      <Td className="text-black/60">{formatDate(c.created_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/clients" params={{ q, filter }} />
          </>
        ) : (
          <EmptyState>No clients found.</EmptyState>
        )}
      </Panel>
    </>
  );
}
