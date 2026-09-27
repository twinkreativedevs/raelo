import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { ilikePattern } from "@/lib/admin/search";
import { clientLabel, workableSubscriptions } from "@/lib/admin/subscriptions";
import { formatDate } from "@/lib/format";
import { NewBatchForm } from "@/components/admin/new-batch-form";
import { AdminPageHeader, EmptyState, Pagination, Panel, StatusBadge, Table, Td, Th, inputClass } from "@/components/admin/ui";

export const metadata = { title: "Content" };

const PAGE_SIZE = 25;

export default async function ContentPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>;
}) {
  const { supabase } = await requireStaff("/admin/content");
  const params = await searchParams;
  const status = params.status === "draft" || params.status === "published" ? params.status : undefined;
  const q = params.q?.trim().slice(0, 50) || undefined;
  const term = ilikePattern(q);
  const page = Math.max(1, Number(params.page) || 1);

  // RLS limits team members to batches of their assigned subscriptions.
  let query = supabase
    .from("content_batches")
    .select("id, title, status, period_start, published_at, updated_at, subscriptions(user_id, profiles(full_name, company_name, email)), content_items(count)", { count: "exact" });
  if (status) query = query.eq("status", status);
  if (term) query = query.ilike("title", term);

  const [{ data: batches, count }, subscriptions] = await Promise.all([
    query.order("updated_at", { ascending: false }).range((page - 1) * PAGE_SIZE, page * PAGE_SIZE - 1),
    workableSubscriptions(supabase),
  ]);

  return (
    <>
      <AdminPageHeader title="Content" description="Batches are drafts until an admin or account manager publishes them." />

      <Panel title="Start a new batch">
        <NewBatchForm subscriptions={subscriptions} />
      </Panel>

      <form className="flex flex-wrap items-end gap-2">
        <input name="q" defaultValue={q} placeholder="Batch title" className={inputClass} aria-label="Search batches" />
        <select name="status" defaultValue={status ?? ""} className={inputClass} aria-label="Status">
          <option value="">Drafts + published</option>
          <option value="draft">Drafts</option>
          <option value="published">Published</option>
        </select>
        <button className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white">Filter</button>
        <Link href="/admin/content" className="h-9 px-2 text-sm leading-9 text-black/50">Reset</Link>
      </form>

      <Panel>
        {batches?.length ? (
          <>
            <Table>
              <thead>
                <tr><Th>Batch</Th><Th>Client</Th><Th>Files</Th><Th>Status</Th><Th>Updated</Th></tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const sub = b.subscriptions as unknown as { user_id: string; profiles: { full_name: string | null; company_name: string | null; email: string } | null } | null;
                  const files = (b.content_items as unknown as { count: number }[])[0]?.count ?? 0;
                  return (
                    <tr key={b.id}>
                      <Td><Link href={`/admin/content/${b.id}`} className="font-semibold hover:text-[#ed1c24]">{b.title}</Link></Td>
                      <Td>{clientLabel(sub?.profiles ?? null)}</Td>
                      <Td className="tabular-nums">{files}</Td>
                      <Td><StatusBadge status={b.status} /></Td>
                      <Td className="text-black/60">{formatDate(b.status === "published" ? b.published_at : b.updated_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={count ?? 0} basePath="/admin/content" params={{ q, status }} />
          </>
        ) : (
          <EmptyState>No batches yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
