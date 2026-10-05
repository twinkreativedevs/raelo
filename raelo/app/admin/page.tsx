import { desc, eq, inArray } from "drizzle-orm";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { batchFileCounts } from "@/lib/content";
import { schema } from "@/lib/db";
import { dashboardStats, revenueByMonth } from "@/lib/admin/metrics";
import { formatDate, formatMoney } from "@/lib/format";
import { RevenueChart } from "@/components/admin/revenue-chart";
import { SearchBox } from "@/components/admin/search-box";
import {
  AdminPageHeader,
  EmptyState,
  Panel,
  StatCard,
  StatusBadge,
  Table,
  Td,
  Th,
} from "@/components/admin/ui";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const { asUser, profile } = await requireStaff("/admin");

  if (profile.role !== "admin") return <TeamDashboard />;

  const [stats, revenue, recentOrders] = await asUser((tx) =>
    Promise.all([
      dashboardStats(tx),
      revenueByMonth(tx, 12),
      tx.query.orders.findMany({
        orderBy: [desc(schema.orders.created_at)],
        limit: 8,
        columns: { id: true, order_number: true, status: true, kind: true, amount: true, currency: true, created_at: true },
        with: {
          profile: { columns: { full_name: true, email: true } },
          package: { columns: { name: true } },
        },
      }),
    ]),
  );

  return (
    <>
      <AdminPageHeader title="Dashboard">
        <SearchBox />
      </AdminPageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={formatMoney(stats.revenueThisMonth, "NGN")} hint={`${stats.ordersThisMonth} paid orders`} href="/admin/revenue" />
        <StatCard label="Monthly recurring" value={formatMoney(stats.mrr, "NGN")} hint="From paying active subscriptions" />
        <StatCard label="Active subscriptions" value={stats.activeSubscriptions} hint={`${stats.newClientsThisMonth} new clients this month`} href="/admin/clients" />
        <StatCard label="Drafts to publish" value={stats.draftBatches} hint="Content batches in draft" href="/admin/content?status=draft" />
      </div>

      {(stats.awaitingBrief > 0 || stats.failedRenewals > 0) && (
        <div className="grid gap-4 sm:grid-cols-2">
          {stats.awaitingBrief > 0 && (
            <StatCard label="Waiting on brand brief" value={stats.awaitingBrief} hint="Active clients who haven't finished onboarding" href="/admin/clients?filter=no_brief" />
          )}
          {stats.failedRenewals > 0 && (
            <StatCard label="Failed renewals" value={stats.failedRenewals} hint="Active subscriptions whose card was declined" href="/admin/clients?filter=failed_renewal" />
          )}
        </div>
      )}

      <Panel title="Revenue, last 12 months">
        <RevenueChart data={revenue} />
      </Panel>

      <Panel title="Recent orders" action={<Link href="/admin/orders" className="text-sm font-semibold text-[#ed1c24]">All orders →</Link>}>
        {recentOrders.length ? (
          <Table>
            <thead>
              <tr>
                <Th>Order</Th>
                <Th>Client</Th>
                <Th>Package</Th>
                <Th>Status</Th>
                <Th className="text-right">Amount</Th>
                <Th>Date</Th>
              </tr>
            </thead>
            <tbody>
              {recentOrders.map((order) => {
                const client = order.profile;
                const pkg = order.package;
                return (
                  <tr key={order.id}>
                    <Td className="font-semibold">{order.order_number}{order.kind === "renewal" && <span className="ml-1 text-xs font-normal text-black/40">renewal</span>}</Td>
                    <Td>{client?.full_name ?? client?.email}</Td>
                    <Td>{pkg?.name}</Td>
                    <Td><StatusBadge status={order.status} /></Td>
                    <Td className="text-right tabular-nums">{formatMoney(order.amount, order.currency)}</Td>
                    <Td className="text-black/60">{formatDate(order.created_at)}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No orders yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}

/** Designers and account managers: their assigned clients and open drafts. */
async function TeamDashboard() {
  const { asUser, profile } = await requireStaff("/admin");

  const { subs, briefs, drafts, fileCounts } = await asUser(async (tx) => {
    const assignments = await tx.query.subscription_assignments.findMany({
      where: eq(schema.subscription_assignments.profile_id, profile.id),
      columns: { role: true },
      with: {
        subscription: {
          columns: { id: true, status: true, expires_at: true, user_id: true },
          with: {
            package: { columns: { name: true } },
            profile: { columns: { full_name: true, company_name: true, email: true } },
          },
        },
      },
    });
    const subs = assignments.flatMap((a) => (a.subscription ? [{ ...a.subscription, assignedAs: a.role }] : []));

    const [briefs, drafts] = await Promise.all([
      subs.length
        ? tx
            .select({ user_id: schema.onboarding_responses.user_id, completed: schema.onboarding_responses.completed })
            .from(schema.onboarding_responses)
            .where(inArray(schema.onboarding_responses.user_id, subs.map((s) => s.user_id)))
        : Promise.resolve([]),
      tx
        .select({ id: schema.content_batches.id, title: schema.content_batches.title, updated_at: schema.content_batches.updated_at })
        .from(schema.content_batches)
        .where(eq(schema.content_batches.status, "draft"))
        .orderBy(desc(schema.content_batches.updated_at)),
    ]);
    const fileCounts = await batchFileCounts(tx, drafts.map((d) => d.id));
    return { subs, briefs, drafts, fileCounts };
  });
  const briefDone = new Set(briefs.filter((b) => b.completed).map((b) => b.user_id));

  return (
    <>
      <AdminPageHeader title={`Hi ${profile.full_name?.split(" ")[0] ?? "there"}`} description="Clients assigned to you and content in progress." />

      <Panel title="Your clients">
        {subs.length ? (
          <Table>
            <thead>
              <tr><Th>Client</Th><Th>Package</Th><Th>Subscription</Th><Th>Brief</Th><Th>Your role</Th><Th /></tr>
            </thead>
            <tbody>
              {subs.map((sub) => (
                <tr key={sub.id}>
                  <Td className="font-semibold">{sub.profile?.company_name || sub.profile?.full_name || sub.profile?.email}</Td>
                  <Td>{sub.package?.name}</Td>
                  <Td><StatusBadge status={sub.status} /></Td>
                  <Td>{briefDone.has(sub.user_id) ? "Complete" : <span className="text-amber-700">Waiting</span>}</Td>
                  <Td className="capitalize text-black/60">{sub.assignedAs.replace("_", " ")}</Td>
                  <Td className="text-right"><Link href={`/admin/clients/${sub.user_id}`} className="font-semibold text-[#ed1c24]">Open →</Link></Td>
                </tr>
              ))}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No clients assigned to you yet. An admin assigns clients from the client page.</EmptyState>
        )}
      </Panel>

      <Panel title="Drafts in progress" action={<Link href="/admin/content" className="text-sm font-semibold text-[#ed1c24]">All content →</Link>}>
        {drafts.length ? (
          <ul className="divide-y divide-black/5 text-sm">
            {drafts.map((batch) => (
              <li key={batch.id}>
                <Link href={`/admin/content/${batch.id}`} className="flex justify-between py-3 hover:text-[#ed1c24]">
                  <span className="font-semibold">{batch.title}</span>
                  <span className="text-black/50">
                    {fileCounts.get(batch.id) ?? 0} files · updated {formatDate(batch.updated_at)}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No drafts in progress.</EmptyState>
        )}
      </Panel>
    </>
  );
}
