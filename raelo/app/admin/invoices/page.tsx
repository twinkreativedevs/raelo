import { count as countRows, desc, ilike, or } from "drizzle-orm";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { ilikePattern } from "@/lib/admin/search";
import { formatDate, formatMoney } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, EmptyState, Pagination, Panel, StatusBadge, Table, Td, Th, inputClass } from "@/components/admin/ui";
import { setInvoiceStatus } from "./actions";

export const metadata = { title: "Invoices" };

const PAGE_SIZE = 25;

export default async function InvoicesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { asUser } = await requireStaff("/admin/invoices", ["admin"]);
  const params = await searchParams;
  const q = params.q?.trim().slice(0, 50) || undefined;
  const term = ilikePattern(q);
  const page = Math.max(1, Number(params.page) || 1);

  const inv = schema.invoices;
  const where = term ? or(ilike(inv.invoice_number, term), ilike(inv.billed_to_name, term), ilike(inv.billed_to_email, term)) : undefined;
  const [invoices, [{ n: count }]] = await asUser((tx) =>
    Promise.all([
      tx.query.invoices.findMany({
        where,
        orderBy: [desc(inv.issued_at)],
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        columns: { id: true, invoice_number: true, status: true, total: true, currency: true, issued_at: true, billed_to_name: true, billed_to_email: true, user_id: true },
        with: { order: { columns: { order_number: true } } },
      }),
      tx.select({ n: countRows() }).from(inv).where(where),
    ]),
  );

  return (
    <>
      <AdminPageHeader title="Invoices" description="Issued automatically for every paid order." />
      <form className="flex gap-2">
        <input name="q" defaultValue={q} placeholder="Invoice no., name or email" className={inputClass} aria-label="Search invoices" />
        <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Search</button>
      </form>
      <Panel>
        {invoices.length ? (
          <>
            <Table>
              <thead><tr><Th>Invoice</Th><Th>Billed to</Th><Th>Order</Th><Th>Status</Th><Th className="text-right">Total</Th><Th>Issued</Th><Th /></tr></thead>
              <tbody>
                {invoices.map((i) => (
                  <tr key={i.id}>
                    <Td><a href={`/api/invoices/${i.id}`} className="font-semibold text-[#ed1c24]">{i.invoice_number}</a></Td>
                    <Td><Link href={`/admin/clients/${i.user_id}`} className="hover:text-[#ed1c24]">{i.billed_to_name ?? i.billed_to_email}</Link></Td>
                    <Td className="text-black/60">{i.order?.order_number}</Td>
                    <Td><StatusBadge status={i.status} /></Td>
                    <Td className="text-right tabular-nums">{formatMoney(i.total, i.currency)}</Td>
                    <Td className="text-black/60">{formatDate(i.issued_at)}</Td>
                    <Td className="text-right">
                      {i.status === "paid" ? (
                        <ConfirmAction label="Void" tone="danger" confirm={`Void ${i.invoice_number}?`} action={setInvoiceStatus.bind(null, i.id, "void")} />
                      ) : (
                        <ConfirmAction label="Restore" action={setInvoiceStatus.bind(null, i.id, "paid")} />
                      )}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/invoices" params={{ q }} />
          </>
        ) : (
          <EmptyState>No invoices found.</EmptyState>
        )}
      </Panel>
    </>
  );
}
