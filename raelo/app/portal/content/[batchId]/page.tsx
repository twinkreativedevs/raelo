import { and, asc, eq } from "drizzle-orm";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { isUuid } from "@/lib/format";
import { isImage, isVideo, signPreviewUrls } from "@/lib/content";
import { schema } from "@/lib/db";
import { formatBytes, formatDate } from "@/lib/format";
import { CopyButton } from "@/components/portal/copy-button";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Content batch" };

export default async function BatchPage({
  params,
}: {
  params: Promise<{ batchId: string }>;
}) {
  const { batchId } = await params;
  const { asUser } = await requireProfile(`/portal/content/${batchId}`);
  if (!isUuid(batchId)) notFound();

  // RLS: a client only gets a row back for their own published batch.
  const batch = await asUser((tx) =>
    tx.query.content_batches.findFirst({
      where: and(eq(schema.content_batches.id, batchId), eq(schema.content_batches.status, "published")),
      columns: { id: true, title: true, status: true, published_at: true, client_message: true },
      with: {
        content_items: {
          columns: {
            id: true, title: true, caption: true, platform: true, content_type: true, storage_path: true,
            asset_url: true, file_name: true, mime_type: true, file_size_bytes: true, scheduled_for: true, sort_order: true,
          },
          orderBy: [asc(schema.content_items.sort_order), asc(schema.content_items.created_at)],
        },
      },
    }),
  );

  if (!batch) notFound();
  const items = batch.content_items;

  const previews = await signPreviewUrls(items);
  const hasFiles = items.some((item) => item.storage_path);

  return (
    <div className="space-y-8">
      <Link
        href="/portal/content"
        className="text-sm font-semibold text-black/50 hover:text-black"
      >
        ← All content
      </Link>

      <PageHeader eyebrow={`Delivered ${formatDate(batch.published_at)}`} title={batch.title}>
        {hasFiles && (
          <a
            href={`/api/content/batches/${batch.id}/zip`}
            className="rounded-full bg-[#ed1c24] px-5 py-2.5 text-sm font-bold text-white hover:bg-[#c9141b]"
          >
            Download all (.zip)
          </a>
        )}
      </PageHeader>

      {batch.client_message && (
        <div className="whitespace-pre-line card p-6 text-sm leading-6 text-black/70">
          {batch.client_message}
        </div>
      )}

      {!items?.length ? (
        <p className="text-sm text-black/60">This batch has no files.</p>
      ) : (
        <ul className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((item) => {
            const preview = previews[item.id];
            return (
              <li
                key={item.id}
                className="card flex flex-col overflow-hidden"
              >
                <div className="flex aspect-square items-center justify-center bg-black/5">
                  {preview && isImage(item) ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={preview}
                      alt={item.title}
                      className="h-full w-full object-cover"
                    />
                  ) : preview && isVideo(item) ? (
                    <video
                      src={preview}
                      controls
                      preload="metadata"
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <span className="text-sm font-semibold uppercase text-black/30">
                      {item.mime_type?.split("/")[1] ?? "file"}
                    </span>
                  )}
                </div>

                <div className="flex flex-1 flex-col gap-3 p-5">
                  <div>
                    <h2 className="font-bold">{item.title}</h2>
                    <p className="mt-1 text-xs text-black/50">
                      {[
                        item.platform,
                        item.content_type,
                        formatBytes(item.file_size_bytes),
                        item.scheduled_for && `Post on ${formatDate(item.scheduled_for)}`,
                      ]
                        .filter(Boolean)
                        .join(" · ")}
                    </p>
                  </div>

                  {item.caption && (
                    <div className="space-y-2">
                      <p className="line-clamp-4 whitespace-pre-line text-sm text-black/70">
                        {item.caption}
                      </p>
                      <CopyButton text={item.caption} />
                    </div>
                  )}

                  {(item.storage_path || item.asset_url) && (
                    <a
                      href={`/api/content/${item.id}/download`}
                      className="mt-auto rounded-lg bg-[#111827] px-4 py-2.5 text-center text-sm font-bold text-white hover:bg-black"
                    >
                      Download
                    </a>
                  )}
                </div>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
