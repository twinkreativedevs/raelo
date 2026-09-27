import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { revenueByMonth, startOfMonthUTC } from "@/lib/admin/metrics";
import { formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { AdminPageHeader, EmptyState, Panel, StatCard, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Revenue" };

const RANGES = [3, 6, 12, 24];

export default async function RevenuePage({ searchParams }: { searchParams: Promise<{ months?: string }> }) {
  const { supabase } = await requireStaff("/admin/revenue", ["admin"]);
  const requested = Number((await searchParams).months);
  const months = RANGES.includes(requested) ? requested : 12;
  const from = startOfMonthUTC(new Date(), -(months - 1));

  const [series, { data: orders }] = await Promise.all([
    revenueByMonth(supabase, months),
    supabase
      .from("orders")
      .select("amount, discount_amount, kind, packages(name)")
      .eq("status", "paid")
      .gte("paid_at", from.toISOString()),
  ]);

  const total = series.reduce((s, p) => s + p.amount, 0);
  const count = series.reduce((s, p) => s + p.orders, 0);
  const renewals = (orders ?? []).filter((o) => o.kind === "renewal");
  const discounts = (orders ?? []).reduce((s, o) => s + Number(o.discount_amount), 0);

  const byPackage = new Map<string, { orders: number; amount: number }>();
  for (const o of orders ?? []) {
    const name = (o.packages as unknown as { name: string } | null)?.name ?? "Unknown";
    const row = byPackage.get(name) ?? { orders: 0, amount: 0 };
    row.orders += 1;
    row.amount += Number(o.amount);
    byPackage.set(name, row);
  }
  const packageRows = [...byPackage.entries()].sort((a, b) => b[1].amount - a[1].amount);
  const csvFrom = from.toISOString().slice(0, 10);

  return (
    <>
      <AdminPageHeader title="Revenue" description="Paid orders only, grouped by the month they were paid (UTC).">
        <a href={`/api/admin/orders.csv?status=paid&from=${csvFrom}`} className="rounded-lg border border-black/10 bg-white px-3 py-2 text-sm font-semibold">
          Export CSV
        </a>
      </AdminPageHeader>

      <div className="flex gap-1 text-sm font-semibold">
        {RANGES.map((m) => (
          <Link key={m} href={`/admin/revenue?months=${m}`} className={cn("rounded-lg px-3 py-1.5", m === months ? "bg-[#111827] text-white" : "bg-white text-black/60 hover:text-black")}>
            Last {m} months
          </Link>
        ))}
      </div>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue" value={formatMoney(total, "NGN")} hint={`${count} paid orders`} />
        <StatCard label="Average order" value={formatMoney(count ? Math.round(total / count) : 0, "NGN")} />
        <StatCard label="From renewals" value={formatMoney(renewals.reduce((s, o) => s + Number(o.amount), 0), "NGN")} hint={`${renewals.length} renewals`} />
        <StatCard label="Discounts given" value={formatMoney(discounts, "NGN")} hint="Affiliate referrals" />
      </div>

      <Panel title="By month">
        <RevenueChart data={series} />
      </Panel>

      <Panel title="By package">
        {packageRows.length ? (
          <Table>
            <thead><tr><Th>Package</Th><Th className="text-right">Orders</Th><Th className="text-right">Revenue</Th><Th className="text-right">Share</Th></tr></thead>
            <tbody>
              {packageRows.map(([name, row]) => (
                <tr key={name}>
                  <Td className="font-semibold">{name}</Td>
                  <Td className="text-right tabular-nums">{row.orders}</Td>
                  <Td className="text-right tabular-nums">{formatMoney(row.amount, "NGN")}</Td>
                  <Td className="text-right tabular-nums">{total ? Math.round((row.amount / total) * 100) : 0}%</Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No paid orders in this period.</EmptyState>
        )}
      </Panel>
    </>
  );
}
