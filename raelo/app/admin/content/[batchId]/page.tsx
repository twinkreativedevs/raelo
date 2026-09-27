import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { clientLabel } from "@/lib/admin/subscriptions";
import { signPreviewUrls } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { BatchForm } from "@/components/admin/batch-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { ContentUploader } from "@/components/admin/content-uploader";
import { ItemEditor } from "@/components/admin/item-editor";
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from "@/components/admin/ui";
import { deleteBatch, setBatchStatus } from "../actions";

export const metadata = { title: "Content batch" };

export default async function BatchEditorPage({ params }: { params: Promise<{ batchId: string }> }) {
  const { batchId } = await params;
  const { supabase, profile } = await requireStaff(`/admin/content/${batchId}`);

  const { data: batch } = await supabase
    .from("content_batches")
    .select("id, title, status, period_start, client_message, internal_notes, published_at, subscription_id, subscriptions(user_id, profiles(full_name, company_name, email))")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) notFound();

  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, caption, platform, content_type, scheduled_for, mime_type, file_name, file_size_bytes, storage_path, sort_order")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const previews = await signPreviewUrls(items ?? []);
  const sub = batch.subscriptions as unknown as { user_id: string; profiles: { full_name: string | null; company_name: string | null; email: string } | null } | null;
  const canPublish = profile.role === "admin" || profile.role === "account_manager";
  const canDelete = profile.role === "admin" || batch.status === "draft";

  return (
    <>
      <Link href="/admin/content" className="text-sm font-semibold text-black/50 hover:text-black">← Content</Link>

      <AdminPageHeader
        title={batch.title}
        description={`${clientLabel(sub?.profiles ?? null)}${batch.published_at ? ` · published ${formatDate(batch.published_at)}` : ""}`}
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
