import Link from "next/link";

import { requireStaff } from "@/lib/auth";
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
  const { supabase, profile } = await requireStaff("/admin");

  if (profile.role !== "admin") return <TeamDashboard />;

  const [stats, revenue, { data: recentOrders }] = await Promise.all([
    dashboardStats(supabase),
    revenueByMonth(supabase, 12),
    supabase
      .from("orders")
      .select("id, order_number, status, kind, amount, currency, created_at, profiles(full_name, email), packages(name)")
      .order("created_at", { ascending: false })
      .limit(8),
  ]);

  return (
    <>
      <AdminPageHeader title="Dashboard">
        <SearchBox />
      </AdminPageHeader>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Revenue this month" value={formatMoney(stats.revenueThisMonth, "NGN")} hint={`${stats.ordersThisMonth} paid orders`} href="/admin/revenue" />
        <StatCard label="Monthly recurring" value={formatMoney(stats.mrr, "NGN")} hint="From active subscriptions" />
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
        {recentOrders?.length ? (
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
                const client = order.profiles as unknown as { full_name: string | null; email: string } | null;
                const pkg = order.packages as unknown as { name: string } | null;
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
  const { supabase, profile } = await requireStaff("/admin");

  const { data: assignments } = await supabase
    .from("subscription_assignments")
    .select("role, subscriptions(id, status, expires_at, user_id, packages(name), profiles(full_name, company_name, email))")
    .eq("profile_id", profile.id);

  const subs = (assignments ?? []).flatMap((a) => {
    const sub = a.subscriptions as unknown as {
      id: string; status: string; expires_at: string | null; user_id: string;
      packages: { name: string } | null;
      profiles: { full_name: string | null; company_name: string | null; email: string } | null;
    } | null;
    return sub ? [{ ...sub, assignedAs: a.role }] : [];
  });

  const [{ data: briefs }, { data: drafts }] = await Promise.all([
    subs.length
      ? supabase.from("onboarding_responses").select("user_id, completed").in("user_id", subs.map((s) => s.user_id))
      : Promise.resolve({ data: [] as { user_id: string; completed: boolean }[] }),
    supabase
      .from("content_batches")
      .select("id, title, updated_at, subscription_id, content_items(count)")
      .eq("status", "draft")
      .order("updated_at", { ascending: false }),
  ]);
  const briefDone = new Set((briefs ?? []).filter((b) => b.completed).map((b) => b.user_id));

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
                  <Td className="font-semibold">{sub.profiles?.company_name || sub.profiles?.full_name || sub.profiles?.email}</Td>
                  <Td>{sub.packages?.name}</Td>
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
        {drafts?.length ? (
          <ul className="divide-y divide-black/5 text-sm">
            {drafts.map((batch) => (
              <li key={batch.id}>
                <Link href={`/admin/content/${batch.id}`} className="flex justify-between py-3 hover:text-[#ed1c24]">
                  <span className="font-semibold">{batch.title}</span>
                  <span className="text-black/50">
                    {(batch.content_items as unknown as { count: number }[])[0]?.count ?? 0} files · updated {formatDate(batch.updated_at)}
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
