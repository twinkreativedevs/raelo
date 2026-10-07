import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { listOrders, parseOrderFilters } from "@/lib/admin/orders";
import { formatDate, formatMoney } from "@/lib/format";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, EmptyState, Pagination, Panel, StatusBadge, Table, Td, Th, inputClass } from "@/components/admin/ui";
import { markOrderRefunded } from "./actions";

export const metadata = { title: "Orders" };

const PAGE_SIZE = 25;

export default async function OrdersPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { asUser } = await requireStaff("/admin/orders", ["admin"]);
  const params = await searchParams;
  const filters = parseOrderFilters(params);
  const page = Math.max(1, Number(params.page) || 1);

  const { rows: orders, count } = await asUser((tx) =>
    listOrders(tx, filters, { limit: PAGE_SIZE, offset: (page - 1) * PAGE_SIZE }),
  );

  const exportQuery = new URLSearchParams(
    Object.entries(filters).filter(([, v]) => v) as [string, string][],
  );

  return (
    <>
      <AdminPageHeader title="Orders" description="Every payment attempt: first purchases and renewals.">
        <a href={`/api/admin/orders.csv?${exportQuery}`} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
          Export CSV
        </a>
      </AdminPageHeader>

      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={filters.q} placeholder="Order no. or reference" className={inputClass} aria-label="Search orders" />
        <select name="status" defaultValue={filters.status ?? ""} className={inputClass} aria-label="Status">
          <option value="">All statuses</option>
          {["paid", "pending", "failed", "abandoned", "refunded"].map((s) => <option key={s} value={s}>{s}</option>)}
        </select>
        <select name="kind" defaultValue={filters.kind ?? ""} className={inputClass} aria-label="Type">
          <option value="">New + renewals</option>
          <option value="new">New</option>
          <option value="renewal">Renewals</option>
        </select>
        <input type="date" name="from" defaultValue={filters.from} className={inputClass} aria-label="From date" />
        <input type="date" name="to" defaultValue={filters.to} className={inputClass} aria-label="To date" />
        <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Filter</button>
        <Link href="/admin/orders" className="h-9 px-2 text-sm leading-9 text-black/50">Reset</Link>
      </form>

      <Panel>
        {orders.length ? (
          <>
            <Table>
              <thead>
                <tr>
                  <Th>Order</Th><Th>Client</Th><Th>Package</Th><Th>Status</Th>
                  <Th className="text-right">Amount</Th><Th>Created</Th><Th>Invoice</Th><Th />
                </tr>
              </thead>
              <tbody>
                {orders.map((order) => {
                  const client = order.profile;
                  const pkg = order.package;
                  const invoice = order.invoices[0];
                  return (
                    <tr key={order.id}>
                      <Td className="font-semibold">
                        {order.order_number}
                        {order.kind === "renewal" && <span className="ml-1 text-xs font-normal text-black/40">renewal</span>}
                      </Td>
                      <Td>
                        <Link href={`/admin/clients/${order.user_id}`} className="hover:text-[#ed1c24]">
                          {client?.company_name || client?.full_name || client?.email}
                        </Link>
                      </Td>
                      <Td>{pkg?.name}</Td>
                      <Td><StatusBadge status={order.status} /></Td>
                      <Td className="text-right tabular-nums">
                        {formatMoney(order.amount, order.currency)}
                        {Number(order.discount_amount) > 0 && <span className="block text-xs text-black/40">−{formatMoney(order.discount_amount, order.currency)} discount</span>}
                      </Td>
                      <Td className="text-black/60">{formatDate(order.created_at)}</Td>
                      <Td>
                        {invoice && (
                          <a href={`/api/invoices/${invoice.id}`} className="text-[#ed1c24]">
                            {invoice.invoice_number}{invoice.status === "void" && " (void)"}
                          </a>
                        )}
                      </Td>
                      <Td className="text-right">
                        {order.status === "paid" && (
                          <ConfirmAction
                            label="Mark refunded"
                            tone="danger"
                            confirm={`Mark ${order.order_number} as refunded and void its invoice? Do the actual refund in Paystack first.`}
                            action={markOrderRefunded.bind(null, order.id)}
                          />
                        )}
                      </Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count} basePath="/admin/orders" params={{ ...filters }} />
          </>
        ) : (
          <EmptyState>No orders match these filters.</EmptyState>
        )}
      </Panel>
    </>
  );
}
