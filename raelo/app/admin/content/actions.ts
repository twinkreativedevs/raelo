"use server";

import { asc, count, desc, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";

import { logActivity } from "@/lib/activity";
import { afterResponse, notifyUser } from "@/lib/notifications";
import { authorize } from "@/lib/auth";
import { PUBLISH_ROLES, TEAM_ROLES } from "@/lib/roles";
import { CONTENT_MAX_BYTES, CONTENT_MIME_TYPES, CONTENT_TYPES, PLATFORMS } from "@/lib/content-upload";
import { schema } from "@/lib/db";
import { CONTENT_PREFIX, deleteFiles } from "@/lib/storage";

// Content workspace actions. Every query runs as the signed-in staff
// member (`asUser`), so RLS limits designers/AMs to assigned subscriptions,
// and the publish trigger limits publishing to admins/AMs.

const { content_batches, content_items, subscriptions } = schema;

/** Runs `fn`; a database refusal (RLS, trigger, constraint) becomes null. */
async function attempt<T>(fn: () => Promise<T>): Promise<T | null> {
  try {
    return await fn();
  } catch (error) {
    console.error("content action refused", error);
    return null;
  }
}

const STAFF = TEAM_ROLES;
const text = (v: unknown, max = 2000) => (typeof v === "string" ? v.trim().slice(0, max) : "");
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export async function createBatch(formData: FormData) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const subscriptionId = text(formData.get("subscription_id"), 64);
  const title = text(formData.get("title"), 120);
  const period = text(formData.get("period_start"), 10);
  if (!subscriptionId || !title) return { error: "Pick a client and give the batch a title." };

  const batch = await attempt(() =>
    auth.asUser(async (tx) => {
      const [row] = await tx
        .insert(content_batches)
        .values({
          subscription_id: subscriptionId,
          title,
          period_start: DATE.test(period) ? period : null,
          created_by: auth.profile.id,
        })
        .returning({ id: content_batches.id });
      return row;
    }),
  );

  if (!batch) return { error: "Couldn't create the batch (are you assigned to this client?)." };
  redirect(`/admin/content/${batch.id}`);
}

export async function updateBatch(batchId: string, input: Record<string, unknown>) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const title = text(input.title, 120);
  if (!title) return { error: "The batch needs a title." };
  const period = text(input.period_start, 10);

  const saved = await attempt(() =>
    auth.asUser((tx) =>
      tx
        .update(content_batches)
        .set({
          title,
          period_start: DATE.test(period) ? period : null,
          client_message: text(input.client_message) || null,
          internal_notes: text(input.internal_notes) || null,
        })
        .where(eq(content_batches.id, batchId))
        .returning({ id: content_batches.id }),
    ),
  );

  if (!saved?.length) return { error: "Couldn't save the batch." };
  revalidatePath(`/admin/content/${batchId}`);
  return { ok: true as const };
}

export async function setBatchStatus(batchId: string, status: "draft" | "published") {
  const auth = await authorize(PUBLISH_ROLES);
  if (!auth) return { error: "Only admins and account managers can publish." };
  if (status !== "draft" && status !== "published") return { error: "Invalid status." };

  const result = await attempt(() =>
    auth.asUser(async (tx) => {
      const [{ n: files }] = await tx
        .select({ n: count() })
        .from(content_items)
        .where(eq(content_items.batch_id, batchId));
      if (status === "published" && !files) return { empty: true as const };

      const [row] = await tx
        .update(content_batches)
        .set({ status })
        .where(eq(content_batches.id, batchId))
        .returning({ id: content_batches.id, title: content_batches.title, subscription_id: content_batches.subscription_id });
      if (!row) return null;
      const [sub] = await tx
        .select({ user_id: subscriptions.user_id })
        .from(subscriptions)
        .where(eq(subscriptions.id, row.subscription_id));
      return { batch: row, clientId: sub?.user_id ?? null, files };
    }),
  );

  if (result && "empty" in result) return { error: "Add at least one file before publishing." };
  if (!result) return { error: "Couldn't change the batch status." };

  const { batch, clientId, files } = result;
  await logActivity(clientId, status === "published" ? "content_published" : "content_unpublished", {
    batch_id: batch.id,
    title: batch.title,
    by: auth.profile.id,
  });

  if (status === "published" && clientId) {
    await afterResponse(() =>
      notifyUser("content_published", clientId, { batchTitle: batch.title, batchId: batch.id, count: files }),
    );
  }

  revalidatePath(`/admin/content/${batchId}`);
  revalidatePath("/admin/content");
  return { ok: true as const };
}

export async function deleteBatch(batchId: string) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const result = await attempt(() =>
    auth.asUser(async (tx) => {
      const items = await tx
        .select({ storage_path: content_items.storage_path })
        .from(content_items)
        .where(eq(content_items.batch_id, batchId));
      // RLS: admins can delete any batch; assigned team only drafts.
      const deleted = await tx
        .delete(content_batches)
        .where(eq(content_batches.id, batchId))
        .returning({ id: content_batches.id });
      return { items, deleted: deleted.length > 0 };
    }),
  );

  if (!result?.deleted) return { error: "Couldn't delete this batch. Published batches can only be deleted by an admin." };

  await deleteFiles(result.items.map((i) => i.storage_path).filter((p): p is string => Boolean(p)));

  revalidatePath("/admin/content");
  redirect("/admin/content");
}

/**
 * Records a file the browser just uploaded (app/api/uploads only issued an
 * upload token for an assigned subscription's folder). If the record can't
 * be saved, the uploaded file is deleted again.
 */
export async function registerUploadedItem(
  batchId: string,
  file: { path: string; name: string; type: string; size: number },
) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const [batch] = await auth.asUser((tx) =>
    tx
      .select({ id: content_batches.id, subscription_id: content_batches.subscription_id })
      .from(content_batches)
      .where(eq(content_batches.id, batchId)),
  );
  if (!batch) return { error: "Batch not found." };

  const prefix = contentPrefix(batch.subscription_id, batch.id);
  if (typeof file.path !== "string" || !file.path.startsWith(prefix) || file.path.includes("..")) {
    return { error: "Unexpected upload path." };
  }
  if (!CONTENT_MIME_TYPES.includes(file.type) || !(file.size > 0 && file.size <= CONTENT_MAX_BYTES)) {
    await deleteFiles([file.path]);
    return { error: "Unsupported file." };
  }

  const fileName = text(file.name, 200) || "file";
  const item = await attempt(() =>
    auth.asUser(async (tx) => {
      const [last] = await tx
        .select({ sort_order: content_items.sort_order })
        .from(content_items)
        .where(eq(content_items.batch_id, batch.id))
        .orderBy(desc(content_items.sort_order))
        .limit(1);
      const [row] = await tx
        .insert(content_items)
        .values({
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
        .returning({ id: content_items.id });
      return row;
    }),
  );

  if (!item) {
    await deleteFiles([file.path]);
    return { error: "Couldn't save the file record." };
  }
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

  const [data] =
    (await attempt(() =>
      auth.asUser((tx) =>
        tx
          .update(content_items)
          .set({
            title,
            caption: text(input.caption, 5000) || null,
            platform: PLATFORMS.includes(platform) ? platform : null,
            content_type: CONTENT_TYPES.includes(contentType) ? contentType : null,
            scheduled_for: DATE.test(scheduled) ? `${scheduled}T09:00:00Z` : null,
          })
          .where(eq(content_items.id, itemId))
          .returning({ batch_id: content_items.batch_id }),
      ),
    )) ?? [];

  if (!data) return { error: "Couldn't save." };
  revalidatePath(`/admin/content/${data.batch_id}`);
  return { ok: true as const };
}

export async function moveItem(itemId: string, direction: "up" | "down") {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const batchId = await attempt(() =>
    auth.asUser(async (tx) => {
      const [item] = await tx
        .select({ id: content_items.id, batch_id: content_items.batch_id })
        .from(content_items)
        .where(eq(content_items.id, itemId));
      if (!item?.batch_id) return null;

      const list = await tx
        .select({ id: content_items.id })
        .from(content_items)
        .where(eq(content_items.batch_id, item.batch_id))
        .orderBy(asc(content_items.sort_order), asc(content_items.created_at));

      const index = list.findIndex((i) => i.id === item.id);
      const swapWith = direction === "up" ? index - 1 : index + 1;
      if (index < 0 || swapWith < 0 || swapWith >= list.length) return item.batch_id;

      // Renumber everything so ties can't make the order ambiguous.
      [list[index], list[swapWith]] = [list[swapWith], list[index]];
      for (const [i, row] of list.entries()) {
        await tx.update(content_items).set({ sort_order: i + 1 }).where(eq(content_items.id, row.id));
      }
      return item.batch_id;
    }),
  );
  if (!batchId) return { error: "Not found." };

  revalidatePath(`/admin/content/${batchId}`);
  return { ok: true as const };
}

export async function deleteItem(itemId: string) {
  const auth = await authorize([...STAFF]);
  if (!auth) return { error: "Not allowed." };

  const [data] =
    (await attempt(() =>
      auth.asUser((tx) =>
        tx
          .delete(content_items)
          .where(eq(content_items.id, itemId))
          .returning({ batch_id: content_items.batch_id, storage_path: content_items.storage_path }),
      ),
    )) ?? [];

  if (!data) return { error: "Couldn't delete this file." };
  if (data.storage_path) await deleteFiles([data.storage_path]);

  revalidatePath(`/admin/content/${data.batch_id}`);
  return { ok: true as const };
}

/** Blob folder for a batch's files; uploads must land inside it. */
function contentPrefix(subscriptionId: string, batchId: string) {
  return `${CONTENT_PREFIX}${subscriptionId}/${batchId}/`;
}
