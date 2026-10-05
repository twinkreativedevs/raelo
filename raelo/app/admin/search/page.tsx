import { and, eq, ilike, or } from "drizzle-orm";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { ilikePattern } from "@/lib/admin/search";
import { formatDate, formatMoney } from "@/lib/format";
import { SearchBox } from "@/components/admin/search-box";
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Search" };

export default async function SearchPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { asUser, profile } = await requireStaff("/admin/search");
  const q = ((await searchParams).q ?? "").trim().slice(0, 100);
  const term = ilikePattern(q) ?? "";
  const isAdmin = profile.role === "admin";

  // RLS narrows results for team members to their assigned clients; orders
  // and invoices are admin-only.
  const { profiles: p, orders: o, invoices: i } = schema;
  const [clientRows, orderRows, invoiceRows] = q
    ? await asUser((tx) =>
        Promise.all([
          tx
            .select({ id: p.id, full_name: p.full_name, email: p.email, company_name: p.company_name, role: p.role })
            .from(p)
            .where(and(eq(p.role, "client"), or(ilike(p.full_name, term), ilike(p.email, term), ilike(p.company_name, term), ilike(p.phone, term))))
            .limit(20),
          isAdmin
            ? tx
                .select({ id: o.id, order_number: o.order_number, status: o.status, amount: o.amount, currency: o.currency, created_at: o.created_at, user_id: o.user_id })
                .from(o)
                .where(ilike(o.order_number, term))
                .limit(20)
            : Promise.resolve([]),
          isAdmin
            ? tx
                .select({ id: i.id, invoice_number: i.invoice_number, total: i.total, currency: i.currency, issued_at: i.issued_at, billed_to_name: i.billed_to_name })
                .from(i)
                .where(or(ilike(i.invoice_number, term), ilike(i.billed_to_name, term), ilike(i.billed_to_email, term)))
                .limit(20)
            : Promise.resolve([]),
        ]),
      )
    : [[], [], []];
  const clients = { data: clientRows };
  const orders = { data: orderRows };
  const invoices = { data: invoiceRows };

  const total = clients.data.length + orders.data.length + invoices.data.length;

  return (
    <>
      <AdminPageHeader title="Search">
        <SearchBox defaultValue={q} />
      </AdminPageHeader>

      {!q ? (
        <EmptyState>Search by client name, email, company, phone, order number or invoice number.</EmptyState>
      ) : total === 0 ? (
        <EmptyState>Nothing matches “{q}”.</EmptyState>
      ) : (
        <>
          {!!clients.data?.length && (
            <Panel title="Clients">
              <ul className="divide-y divide-black/5 text-sm">
                {clients.data.map((c) => (
                  <li key={c.id}>
                    <Link href={`/admin/clients/${c.id}`} className="flex justify-between py-2 hover:text-[#ed1c24]">
                      <span className="font-semibold">{c.full_name ?? c.email}{c.company_name && <span className="font-normal text-black/50"> · {c.company_name}</span>}</span>
                      <span className="text-black/50">{c.email}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {!!orders.data?.length && (
            <Panel title="Orders">
              <ul className="divide-y divide-black/5 text-sm">
                {orders.data.map((o) => (
                  <li key={o.id}>
                    <Link href={`/admin/clients/${o.user_id}`} className="flex items-center justify-between gap-4 py-2 hover:text-[#ed1c24]">
                      <span className="font-semibold">{o.order_number}</span>
                      <StatusBadge status={o.status} />
                      <span className="tabular-nums">{formatMoney(o.amount, o.currency)}</span>
                      <span className="text-black/50">{formatDate(o.created_at)}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
          {!!invoices.data?.length && (
            <Panel title="Invoices">
              <ul className="divide-y divide-black/5 text-sm">
                {invoices.data.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-4 py-2">
                    <a href={`/api/invoices/${i.id}`} className="font-semibold hover:text-[#ed1c24]">{i.invoice_number}</a>
                    <span>{i.billed_to_name}</span>
                    <span className="tabular-nums">{formatMoney(i.total, i.currency)}</span>
                    <span className="text-black/50">{formatDate(i.issued_at)}</span>
                  </li>
                ))}
              </ul>
            </Panel>
          )}
        </>
      )}
    </>
  );
}
