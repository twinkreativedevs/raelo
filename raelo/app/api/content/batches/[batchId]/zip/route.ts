import { NextResponse, type NextRequest } from "next/server";
import { Zip, ZipPassThrough } from "fflate";

import { CONTENT_BUCKET, downloadName, safeFileName } from "@/lib/content";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Streams every file in a batch as one ZIP. Rows are read with the user's
// client (RLS: clients only see published batches), files are fetched with
// the service role. Media is already compressed, so files are stored as-is.

export const maxDuration = 300;

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ batchId: string }> },
) {
  const { batchId } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: batch } = await supabase
    .from("content_batches")
    .select("id, title")
    .eq("id", batchId)
    .maybeSingle();

  if (!batch) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  const { data: items } = await supabase
    .from("content_items")
    .select("id, title, file_name, storage_path")
    .eq("batch_id", batch.id)
    .not("storage_path", "is", null)
    .order("sort_order", { ascending: true })
    .order("created_at", { ascending: true });

  if (!items?.length) {
    return NextResponse.json({ error: "No files in this batch" }, { status: 404 });
  }

  const storage = createAdminClient().storage.from(CONTENT_BUCKET);
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
          const { data, error } = await storage.download(item.storage_path!);
          if (error || !data) {
            throw new Error(`Couldn't read ${item.storage_path}`);
          }
          // Numbered so files keep the batch order and names never clash.
          const name = `${String(index + 1).padStart(width, "0")}-${downloadName(item)}`;
          const entry = new ZipPassThrough(name);
          zip.add(entry);
          entry.push(new Uint8Array(await data.arrayBuffer()), true);
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
