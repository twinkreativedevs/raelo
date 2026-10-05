import { and, count, desc, eq, gt, ilike, inArray, ne, or } from "drizzle-orm";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
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
  const { asUser, profile } = await requireStaff("/admin/clients");
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 50) || undefined;
  const term = ilikePattern(q);
  const filter = params.filter && params.filter in FILTERS ? (params.filter as keyof typeof FILTERS) : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  const { profiles, subscriptions, onboarding_responses, packages } = schema;

  const { clients, count: total, subs, briefs } = await asUser(async (tx) => {
    // Pre-compute the user ids a filter narrows to.
    let onlyIds: string[] | null = null;
    if (filter === "failed_renewal") {
      const data = await tx
        .select({ user_id: subscriptions.user_id })
        .from(subscriptions)
        .where(and(eq(subscriptions.status, "active"), gt(subscriptions.renewal_failures, 0)));
      onlyIds = [...new Set(data.map((s) => s.user_id))];
    } else if (filter === "no_brief") {
      const [subs, briefs] = await Promise.all([
        tx.select({ user_id: subscriptions.user_id }).from(subscriptions).where(eq(subscriptions.status, "active")),
        tx.select({ user_id: onboarding_responses.user_id }).from(onboarding_responses).where(eq(onboarding_responses.completed, true)),
      ]);
      const done = new Set(briefs.map((b) => b.user_id));
      onlyIds = [...new Set(subs.map((s) => s.user_id).filter((id) => !done.has(id)))];
    }

    // RLS: team members only get the clients assigned to them.
    const where = and(
      eq(profiles.role, "client"),
      term
        ? or(ilike(profiles.full_name, term), ilike(profiles.email, term), ilike(profiles.company_name, term), ilike(profiles.phone, term))
        : undefined,
      onlyIds ? (onlyIds.length ? inArray(profiles.id, onlyIds) : eq(profiles.id, "00000000-0000-0000-0000-000000000000")) : undefined,
    );

    const [clients, [{ n }]] = await Promise.all([
      tx
        .select({ id: profiles.id, full_name: profiles.full_name, email: profiles.email, phone: profiles.phone, company_name: profiles.company_name, created_at: profiles.created_at })
        .from(profiles)
        .where(where)
        .orderBy(desc(profiles.created_at))
        .limit(PAGE_SIZE)
        .offset((page - 1) * PAGE_SIZE),
      tx.select({ n: count() }).from(profiles).where(where),
    ]);

    const ids = clients.map((c) => c.id);
    const [subs, briefs] = ids.length
      ? await Promise.all([
          tx
            .select({ user_id: subscriptions.user_id, status: subscriptions.status, expires_at: subscriptions.expires_at, package_name: packages.name })
            .from(subscriptions)
            .innerJoin(packages, eq(packages.id, subscriptions.package_id))
            .where(and(inArray(subscriptions.user_id, ids), ne(subscriptions.status, "pending")))
            .orderBy(desc(subscriptions.created_at)),
          tx
            .select({ user_id: onboarding_responses.user_id, completed: onboarding_responses.completed })
            .from(onboarding_responses)
            .where(inArray(onboarding_responses.user_id, ids)),
        ])
      : [[], []];
    return { clients, count: n, subs, briefs };
  });

  const latestSub = (id: string) => subs.find((s) => s.user_id === id);
  const briefDone = new Set(briefs.filter((b) => b.completed).map((b) => b.user_id));

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
        {clients.length ? (
          <>
            <Table>
              <thead>
                <tr><Th>Client</Th><Th>Contact</Th><Th>Package</Th><Th>Subscription</Th><Th>Brief</Th><Th>Joined</Th></tr>
              </thead>
              <tbody>
                {clients.map((c) => {
                  const sub = latestSub(c.id);
                  const pkg = sub ? { name: sub.package_name } : null;
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
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/clients" params={{ q, filter }} />
          </>
        ) : (
          <EmptyState>No clients found.</EmptyState>
        )}
      </Panel>
    </>
  );
}
