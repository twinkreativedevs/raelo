import { asc, eq } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { clientLabel } from "@/lib/admin/subscriptions";
import { signPreviewUrls } from "@/lib/content";
import { formatDate, isUuid } from "@/lib/format";
import { BatchForm } from "@/components/admin/batch-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ContentUploader } from "@/components/admin/content-uploader";
import { ItemEditor } from "@/components/admin/item-editor";
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from "@/components/admin/ui";
import { deleteBatch, setBatchStatus } from "../actions";

export const metadata = { title: "Content batch" };

export default async function BatchEditorPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const { asUser, profile } = await requireStaff(`/admin/content/${batchId}`);
  if (!isUuid(batchId)) notFound();

  const batch = await asUser((tx) =>
    tx.query.content_batches.findFirst({
      where: eq(schema.content_batches.id, batchId),
      columns: { id: true, title: true, status: true, period_start: true, client_message: true, internal_notes: true, published_at: true, subscription_id: true },
      with: {
        subscription: {
          columns: { user_id: true },
          with: { profile: { columns: { full_name: true, company_name: true, email: true } } },
        },
        content_items: {
          columns: { id: true, title: true, caption: true, platform: true, content_type: true, scheduled_for: true, mime_type: true, file_name: true, file_size_bytes: true, storage_path: true, sort_order: true },
          orderBy: [asc(schema.content_items.sort_order), asc(schema.content_items.created_at)],
        },
      },
    }),
  );
  if (!batch) notFound();

  const items = batch.content_items;
  const previews = await signPreviewUrls(items);
  const sub = batch.subscription;
  const canPublish = profile.role === "admin" || profile.role === "account_manager";
  const canDelete = profile.role === "admin" || batch.status === "draft";

  return (
    <>
      <Link href="/admin/content" className="text-sm font-semibold text-black/50 hover:text-black">← Content</Link>

      <AdminPageHeader
        title={batch.title}
        description={`${clientLabel(sub?.profile ?? null)}${batch.published_at ? ` · published ${formatDate(batch.published_at)}` : ""}`}
      >
        <StatusBadge status={batch.status} />
        {canPublish && batch.status === "draft" && (
          <ConfirmAction
            label="Publish to client"
            tone="primary"
            confirm="Publish this batch? The client will be able to see and download every file in it."
            action={setBatchStatus.bind(null, batch.id, "published")}
          />
        )}
        {canPublish && batch.status === "published" && (
          <ConfirmAction
            label="Unpublish"
            confirm="Hide this batch from the client again?"
            action={setBatchStatus.bind(null, batch.id, "draft")}
          />
        )}
        {sub && (
          <Link href={`/admin/clients/${sub.user_id}`} className="rounded-lg border border-black/10 bg-white px-3 py-1.5 text-xs font-semibold">
            Client & brief
          </Link>
        )}
      </AdminPageHeader>

      {!canPublish && batch.status === "draft" && (
        <p className="rounded-xl bg-amber-50 px-4 py-3 text-sm text-amber-800">
          Drafts are only visible to the team. An account manager or admin publishes the batch when it&apos;s ready.
        </p>
      )}

      <Panel title="Details">
        <BatchForm batch={batch} />
      </Panel>

      <Panel title={`Files (${items?.length ?? 0})`}>
        <ContentUploader subscriptionId={batch.subscription_id} batchId={batch.id} />
        {items?.length ? (
          <ul className="mt-4">
            {items.map((item, i) => (
              <ItemEditor
                key={item.id}
                item={item}
                previewUrl={previews[item.id]}
                isFirst={i === 0}
                isLast={i === items.length - 1}
              />
            ))}
          </ul>
        ) : (
          <EmptyState>No files yet. Upload the designs for this batch above.</EmptyState>
        )}
      </Panel>

      {canDelete && (
        <div className="flex justify-end">
          <ConfirmAction
            label="Delete batch"
            tone="danger"
            confirm="Delete this batch and all of its files? This can't be undone."
            action={deleteBatch.bind(null, batch.id)}
          />
        </div>
      )}
    </>
  );
}
