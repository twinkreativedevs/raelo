import type { Metadata } from "next";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";
import { signPreviewUrls, isImage } from "@/lib/content";
import { formatDate } from "@/lib/format";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Your content" };

export default async function ContentPage() {
  const { supabase, profile } = await requireProfile("/portal/content");

  // RLS returns only published batches of the client's own subscriptions.
  // Filter explicitly too, so staff viewing their own portal see the same.
  const { data: subs } = await supabase
    .from("subscriptions")
    .select("id")
    .eq("user_id", profile.id);
  const subscriptionIds = (subs ?? []).map((s) => s.id);

  const { data: batches } = subscriptionIds.length
    ? await supabase
        .from("content_batches")
        .select(
          "id, title, period_start, published_at, client_message, content_items(id, storage_path, mime_type, sort_order)",
        )
        .eq("status", "published")
        .in("subscription_id", subscriptionIds)
        .order("published_at", { ascending: false })
    : { data: [] };

  // First image of each batch as its cover.
  const covers = (batches ?? []).flatMap((batch) => {
    const items = [...(batch.content_items ?? [])].sort(
      (a, b) => a.sort_order - b.sort_order,
    );
    const cover = items.find((item) => item.storage_path && isImage(item));
    return cover ? [{ ...cover, batchId: batch.id }] : [];
  });
  const coverUrls = await signPreviewUrls(covers);
  const coverFor = (batchId: string) => {
    const cover = covers.find((c) => c.batchId === batchId);
    return cover ? coverUrls[cover.id] : undefined;
  };

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Content" title="Your content" />

      {!batches?.length ? (
        <div className="rounded-2xl bg-white p-10 text-center shadow-sm">
          <h2 className="font-bold">No content yet</h2>
          <p className="mt-2 text-sm text-black/60">
            Your team is working on it. We&apos;ll email and text you as soon
            as your first batch is ready to download.
          </p>
        </div>
      ) : (
        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-3">
          {batches.map((batch) => {
            const count = batch.content_items?.length ?? 0;
            const cover = coverFor(batch.id);
            return (
              <Link
                key={batch.id}
                href={`/portal/content/${batch.id}`}
                className="group overflow-hidden rounded-2xl bg-white shadow-sm transition hover:shadow-md"
              >
                <div className="flex aspect-[4/3] items-center justify-center bg-black/5">
                  {cover ? (
                    // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
                    <img
                      src={cover}
                      alt=""
                      className="h-full w-full object-cover transition group-hover:scale-[1.02]"
                    />
                  ) : (
                    <span className="text-sm text-black/30">{count} files</span>
                  )}
                </div>
                <div className="p-5">
                  <h2 className="font-bold group-hover:text-[#ed1c24]">
                    {batch.title}
                  </h2>
                  <p className="mt-1 text-sm text-black/50">
                    {count} file{count === 1 ? "" : "s"} · delivered{" "}
                    {formatDate(batch.published_at)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
