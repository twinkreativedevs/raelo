import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { AdminPageHeader, EmptyState, Pagination, Panel, Table, Td, Th, inputClass } from "@/components/admin/ui";

export const metadata = { title: "Activity log" };

const PAGE_SIZE = 50;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const { supabase } = await requireStaff("/admin/activity", ["admin"]);
  const params = await searchParams;
  if (params.view === "messages") return <MessagesLog page={Math.max(1, Number(params.page) || 1)} />;
  const type = params.type && /^[a-z_]{1,60}$/.test(params.type) ? params.type : undefined;
  const page = Math.max(1, Number(params.page) || 1);

  let query = supabase
    .from("activity_events")
    .select("id, event_type, metadata, created_at, user_id, profiles(full_name, email)", { count: "exact" });
  if (type) query = query.eq("event_type", type);
  const { data: events, count } = await query
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <AdminPageHeader title="Activity log" description="Payments, onboarding, publishing, renewals and admin changes." />
      <ViewTabs active="events" />
      <form className="flex gap-2">
        <input name="type" defaultValue={type} placeholder="Event type, e.g. payment_completed" className={`${inputClass} w-72`} aria-label="Event type" />
        <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Filter</button>
        <Link href="/admin/activity" className="h-9 px-2 text-sm leading-9 text-black/50">Reset</Link>
      </form>
      <Panel>
        {events?.length ? (
          <>
            <Table>
              <thead><tr><Th>When</Th><Th>Event</Th><Th>User</Th><Th>Details</Th></tr></thead>
              <tbody>
                {events.map((e) => {
                  const user = e.profiles as unknown as { full_name: string | null; email: string } | null;
                  return (
                    <tr key={e.id}>
                      <Td className="whitespace-nowrap text-black/60">{new Date(e.created_at).toLocaleString("en-NG")}</Td>
                      <Td><Link href={`/admin/activity?type=${e.event_type}`} className="font-semibold hover:text-[#ed1c24]">{e.event_type}</Link></Td>
                      <Td>{e.user_id ? <Link href={`/admin/clients/${e.user_id}`} className="hover:text-[#ed1c24]">{user?.full_name ?? user?.email ?? "—"}</Link> : "—"}</Td>
                      <Td><code className="block max-w-md truncate text-xs text-black/50">{JSON.stringify(e.metadata)}</code></Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/activity" params={{ type }} />
          </>
        ) : (
          <EmptyState>No events.</EmptyState>
        )}
      </Panel>
    </>
  );
}

function ViewTabs({ active }: { active: "events" | "messages" }) {
  const tab = (key: string, label: string, href: string) => (
    <Link href={href} className={`rounded-lg px-3 py-1.5 ${active === key ? "bg-[#111827] text-white" : "bg-white text-black/60 hover:text-black"}`}>
      {label}
    </Link>
  );
  return (
    <div className="flex gap-1 text-sm font-semibold">
      {tab("events", "Events", "/admin/activity")}
      {tab("messages", "Messages (email & SMS)", "/admin/activity?view=messages")}
    </div>
  );
}

async function MessagesLog({ page }: { page: number }) {
  const { supabase } = await requireStaff("/admin/activity", ["admin"]);
  const { data: rows, count } = await supabase
    .from("notification_log")
    .select("id, event, channel, recipient, status, error, created_at", { count: "exact" })
    .order("created_at", { ascending: false })
    .range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1);

  return (
    <>
      <AdminPageHeader title="Activity log" description="Every email and SMS the system tried to send." />
      <ViewTabs active="messages" />
      <Panel>
        {rows?.length ? (
          <>
            <Table>
              <thead><tr><Th>When</Th><Th>Event</Th><Th>Channel</Th><Th>To</Th><Th>Result</Th></tr></thead>
              <tbody>
                {rows.map((r) => (
                  <tr key={r.id}>
                    <Td className="whitespace-nowrap text-black/60">{new Date(r.created_at).toLocaleString("en-NG")}</Td>
                    <Td className="font-semibold">{r.event}</Td>
                    <Td className="uppercase text-black/60">{r.channel}</Td>
                    <Td>{r.recipient}</Td>
                    <Td>
                      <span className={r.status === "sent" ? "text-green-700" : r.status === "failed" ? "text-red-600" : "text-black/50"}>{r.status}</span>
                      {r.error && <span className="block text-xs text-black/50">{r.error}</span>}
                    </Td>
                  </tr>
                ))}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/activity" params={{ view: "messages" }} />
          </>
        ) : (
          <EmptyState>No messages sent yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
