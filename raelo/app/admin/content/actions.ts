"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { afterResponse, notifyUser } from "@/lib/notifications";
import { authorize } from "@/lib/auth";
import { CONTENT_BUCKET } from "@/lib/content";
import { CONTENT_MAX_BYTES, CONTENT_MIME_TYPES, CONTENT_TYPES, PLATFORMS } from "@/lib/content-upload";

// Content workspace actions. Every query runs with the signed-in staff
// member's client, so RLS limits designers/AMs to assigned subscriptions,
// and the publish trigger limits publishing to admins/AMs.

const STAFF = ["admin", "account_manager", "designer"] as const;
const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBatch(formData: FormData) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const subscriptionId = text(formData.get("subscription_id"), 64);
  const title = text(formData.get("title"), 120);
  const period = text(formData.get("period_start"), 10);
  if (!subscriptionId || !title) return { error: "Pick a client and give the batch a title." };

  const { data: batch, error } = await auth.supabase
    .from("content_batches")
    .insert({
      subscription_id: subscriptionId,
      title,
      period_start: DATE.test(period) ? period : null,
      created_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error || !batch) return { error: "Couldn't create the batch (are you assigned to this client?)." };
  redirect(`/admin/content/${batch.id}`);
}

export async function updateBatch(batchId: string, input: Record<string, unknown>) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const title = text(input.title, 120);
  if (!title) return { error: "The batch needs a title." };
  const period = text(input.period_start, 10);

  const { error } = await auth.supabase
    .from("content_batches")
    .update({
      title,
      period_start: DATE.test(period) ? period : null,
      client_message: text(input.client_message) || null,
      internal_notes: text(input.internal_notes) || null,
    })
    .eq("id", batchId);

  if (error) return { error: "Couldn't save the batch." };
  revalidatePath(`/admin/content/${batchId}`);
  return { ok: true as const };
}

export async function setBatchStatus(batchId: string, status: "draft" | "published") {
  const auth = await authorize(["admin", "account_manager"]);
  if (!auth) return { error: "Only admins and account managers can publish." };
  if (status !== "draft" && status !== "published") return { error: "Invalid status." };

  if (status === "published") {
    const { count } = await auth.supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batchId);
    if (!count) return { error: "Add at least one file before publishing." };
  }

  const { data: batch, error } = await auth.supabase
    .from("content_batches")
    .update({ status })
    .eq("id", batchId)
    .select("id, title, subscription_id, subscriptions(user_id)")
    .maybeSingle();

  if (error || !batch) return { error: "Couldn't change the batch status." };

  const clientId = (batch.subscriptions as unknown as { user_id: string } | null)?.user_id ?? null;
  await logActivity(clientId, status === "published" ? "content_published" : "content_unpublished", {
    batch_id: batch.id,
    title: batch.title,
    by: auth.profile.id,
  });

  if (status === "published" && clientId) {
    const { count } = await auth.supabase
      .from("content_items")
      .select("id", { count: "exact", head: true })
      .eq("batch_id", batch.id);
    await afterResponse(() =>
      notifyUser("content_published", clientId, { batchTitle: batch.title, batchId: batch.id, count: count ?? 0 }),
    );
  }

  revalidatePath(`/admin/content/${batchId}`);
  revalidatePath("/admin/content");
  return { ok: true as const };
}

export async function deleteBatch(batchId: string) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const { data: items } = await auth.supabase
    .from("content_items")
    .select("storage_path")
    .eq("batch_id", batchId);

  // RLS: admins can delete any batch; assigned team only drafts.
  const { data: deleted, error } = await auth.supabase
    .from("content_batches")
    .delete()
    .eq("id", batchId)
    .select("id");

  if (error || !deleted?.length) return { error: "Couldn't delete this batch. Published batches can only be deleted by an admin." };

  const paths = (items ?? []).map((i) => i.storage_path).filter((p): p is string => Boolean(p));
  if (paths.length) await auth.supabase.storage.from(CONTENT_BUCKET).remove(paths);

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

/**
 * Records a file the browser just uploaded to storage (storage RLS already
 * limited the upload to an assigned subscription's folder).
 */
export async function registerUploadedItem(
  batchId: string,
  file: { path: string; name: string; type: string; size: number },
) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const { data: batch } = await auth.supabase
    .from("content_batches")
    .select("id, subscription_id")
    .eq("id", batchId)
    .maybeSingle();
  if (!batch) return { error: "Batch not found." };

  const prefix = `${batch.subscription_id}/${batch.id}/`;
  if (typeof file.path !== "string" || !file.path.startsWith(prefix) || file.path.includes("..")) {
    return { error: "Unexpected upload path." };
  }
  if (!CONTENT_MIME_TYPES.includes(file.type) || !(file.size > 0 && file.size <= CONTENT_MAX_BYTES)) {
    return { error: "Unsupported file." };
  }

  const { data: last } = await auth.supabase
    .from("content_items")
    .select("sort_order")
    .eq("batch_id", batch.id)
    .order("sort_order", { ascending: false })
    .limit(1)
    .maybeSingle();

  const fileName = text(file.name, 200) || "file";
  const { data: item, error } = await auth.supabase
    .from("content_items")
    .insert({
      subscription_id: batch.subscription_id,
      batch_id: batch.id,
      title: fileName.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ").slice(0, 120) || "Untitled",
      status: "draft",
      storage_path: file.path,
      file_name: fileName,
      mime_type: file.type,
      file_size_bytes: Math.round(file.size),
      sort_order: (last?.sort_order ?? 0) + 1,
      uploaded_by: auth.profile.id,
    })
    .select("id")
    .single();

  if (error || !item) return { error: "Couldn't save the file record." };
  revalidatePath(`/admin/content/${batch.id}`);
  return { ok: true as const, id: item.id };
}

export async function updateItem(itemId: string, input: Record<string, unknown>) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const title = text(input.title, 120);
  if (!title) return { error: "Give the file a title." };
  const platform = text(input.platform, 40);
  const contentType = text(input.content_type, 40);
  const scheduled = text(input.scheduled_for, 10);

  const { data, error } = await auth.supabase
    .from("content_items")
    .update({
      title,
      caption: text(input.caption, 5000) || null,
      platform: PLATFORMS.includes(platform) ? platform : null,
      content_type: CONTENT_TYPES.includes(contentType) ? contentType : null,
      scheduled_for: DATE.test(scheduled) ? `${scheduled}T09:00:00Z` : null,
    })
    .eq("id", itemId)
    .select("batch_id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save." };
  revalidatePath(`/admin/content/${data.batch_id}`);
  return { ok: true as const };
}

export async function moveItem(itemId: string, direction: "up" | "down") {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const { data: item } = await auth.supabase
    .from("content_items")
    .select("id, batch_id, sort_order")
    .eq("id", itemId)
    .maybeSingle();
  if (!item?.batch_id) return { error: "Not found." };

  const { data: items } = await auth.supabase
    .from("content_items")
    .select("id, sort_order")
    .eq("batch_id", item.batch_id)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  const list = items ?? [];
  const index = list.findIndex((i) => i.id === item.id);
  const swapWith = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || swapWith < 0 || swapWith >= list.length) return { ok: true as const };

  // Renumber everything so ties can't make the order ambiguous.
  [list[index], list[swapWith]] = [list[swapWith], list[index]];
  await Promise.all(
    list.map((row, i) => auth.supabase.from("content_items").update({ sort_order: i + 1 }).eq("id", row.id)),
  );

  revalidatePath(`/admin/content/${item.batch_id}`);
  return { ok: true as const };
}

export async function deleteItem(itemId: string) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const { data, error } = await auth.supabase
    .from("content_items")
    .delete()
    .eq("id", itemId)
    .select("batch_id, storage_path")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't delete this file." };
  if (data.storage_path) await auth.supabase.storage.from(CONTENT_BUCKET).remove([data.storage_path]);

  revalidatePath(`/admin/content/${data.batch_id}`);
  return { ok: true as const };
}
