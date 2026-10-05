import { and, asc, eq, isNotNull } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";
import { Zip, ZipPassThrough } from "fflate";

import { currentUser } from "@/lib/auth";
import { downloadName, safeFileName } from "@/lib/content";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { readFile } from "@/lib/storage";

// Streams every file in a batch as one ZIP. Rows are read as the user
// (RLS: clients only see published batches), files are fetched with the
// store token. Media is already compressed, so files are stored as-is.

export const maxDuration = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const auth = await currentUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { content_batches, content_items } = schema;
  const found = isUuid(batchId)
    ? await auth.asUser(async (tx) => {
        const [batch] = await tx
          .select({ id: content_batches.id, title: content_batches.title })
          .from(content_batches)
          .where(eq(content_batches.id, batchId));
        if (!batch) return null;
        const items = await tx
          .select({ id: content_items.id, title: content_items.title, file_name: content_items.file_name, storage_path: content_items.storage_path })
          .from(content_items)
          .where(and(eq(content_items.batch_id, batch.id), isNotNull(content_items.storage_path)))
          .orderBy(asc(content_items.sort_order), asc(content_items.created_at));
        return { batch, items };
      })
    : null;

  if (!found) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { batch, items } = found;
  if (!items.length) {
    return NextResponse.json({ error: "No files in this batch" }, { status: 404 });
  }

  const width = String(items.length).length;

  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      const zip = new Zip((error, chunk, final) => {
        if (error) {
          controller.error(error);
          return;
        }
        controller.enqueue(chunk);
        if (final) controller.close();
      });

      (async () => {
        for (const [index, item] of items.entries()) {
          const data = await readFile(item.storage_path!);
          if (!data) {
            throw new Error(`Couldn't read ${item.storage_path}`);
          }
          // Numbered so files keep the batch order and names never clash.
          const name = `${String(index + 1).padStart(width, "0")}-${downloadName(item)}`;
          const entry = new ZipPassThrough(name);
          zip.add(entry);
          entry.push(data, true);
        }
        zip.end();
      })().catch((error) => {
        console.error("batch zip failed", batch.id, error);
        controller.error(error);
      });
    },
  });

  return new NextResponse(body, {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${safeFileName(batch.title)}.zip"`,
      "Cache-Control": "private, no-store",
    },
  });
}
