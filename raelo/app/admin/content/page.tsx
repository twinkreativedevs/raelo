import { and, count, desc, eq, ilike } from "drizzle-orm";
import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { batchFileCounts } from "@/lib/content";
import { schema } from "@/lib/db";
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
  const { asUser } = await requireStaff("/admin/content");
  const params = await searchParams;
  const status = params.status === "draft" || params.status === "published" ? params.status : undefined;
  const q = params.q?.trim().slice(0, 50) || undefined;
  const term = ilikePattern(q);
  const page = Math.max(1, Number(params.page) || 1);

  // RLS limits team members to batches of their assigned subscriptions.
  const { content_batches } = schema;
  const where = and(
    status ? eq(content_batches.status, status) : undefined,
    term ? ilike(content_batches.title, term) : undefined,
  );

  const { batches, total, subscriptions, fileCounts } = await asUser(async (tx) => {
    const [batches, [{ n }], subscriptions] = await Promise.all([
      tx.query.content_batches.findMany({
        where,
        orderBy: [desc(content_batches.updated_at)],
        limit: PAGE_SIZE,
        offset: (page - 1) * PAGE_SIZE,
        columns: { id: true, title: true, status: true, period_start: true, published_at: true, updated_at: true },
        with: {
          subscription: {
            columns: { user_id: true },
            with: { profile: { columns: { full_name: true, company_name: true, email: true } } },
          },
        },
      }),
      tx.select({ n: count() }).from(content_batches).where(where),
      workableSubscriptions(tx),
    ]);
    const fileCounts = await batchFileCounts(tx, batches.map((b) => b.id));
    return { batches, total: n, subscriptions, fileCounts };
  });

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
        {batches.length ? (
          <>
            <Table>
              <thead>
                <tr><Th>Batch</Th><Th>Client</Th><Th>Files</Th><Th>Status</Th><Th>Updated</Th></tr>
              </thead>
              <tbody>
                {batches.map((b) => {
                  const sub = b.subscription;
                  const files = fileCounts.get(b.id) ?? 0;
                  return (
                    <tr key={b.id}>
                      <Td><Link href={`/admin/content/${b.id}`} className="font-semibold hover:text-[#ed1c24]">{b.title}</Link></Td>
                      <Td>{clientLabel(sub?.profile ?? null)}</Td>
                      <Td className="tabular-nums">{files}</Td>
                      <Td><StatusBadge status={b.status} /></Td>
                      <Td className="text-black/60">{formatDate(b.status === "published" ? b.published_at : b.updated_at)}</Td>
                    </tr>
                  );
                })}
              </tbody>
            </Table>
            <Pagination page={page} pageSize={PAGE_SIZE} total={total} basePath="/admin/content" params={{ q, status }} />
          </>
        ) : (
          <EmptyState>No batches yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
