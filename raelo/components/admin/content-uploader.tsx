"use client";

import { useRef, useState } from "react";
import { useRouter } from "next/navigation";

import { createClient } from "@/lib/supabase/client";
import { CONTENT_MAX_BYTES, CONTENT_MIME_TYPES, storageSafeName } from "@/lib/content-upload";
import { formatBytes } from "@/lib/format";
import { registerUploadedItem } from "@/app/admin/content/actions";

type Row = { name: string; size: number; state: "queued" | "uploading" | "done" | "error"; message?: string };

/**
 * Uploads files straight from the browser to the private content bucket
 * (storage RLS: admins, or team assigned to this subscription), then
 * registers each one as a draft content item.
 */
export function ContentUploader({ subscriptionId, batchId }: { subscriptionId: string; batchId: string }) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [rows, setRows] = useState<Row[]>([]);
  const [dragging, setDragging] = useState(false);
  const busy = rows.some((r) => r.state === "queued" || r.state === "uploading");

  const setRow = (index: number, patch: Partial<Row>) =>
    setRows((prev) => prev.map((row, i) => (i === index ? { ...row, ...patch } : row)));

  const uploadAll = async (files: File[]) => {
    const start = rows.length;
    setRows((prev) => [...prev, ...files.map((f) => ({ name: f.name, size: f.size, state: "queued" as const }))]);
    const storage = createClient().storage.from("content");

    // Sequential keeps order predictable and stays gentle on mobile data.
    for (const [offset, file] of files.entries()) {
      const index = start + offset;
      if (!CONTENT_MIME_TYPES.includes(file.type)) {
        setRow(index, { state: "error", message: "Unsupported type (images, MP4/MOV, PDF only)" });
        continue;
      }
      if (file.size > CONTENT_MAX_BYTES) {
        setRow(index, { state: "error", message: `Too large (max ${formatBytes(CONTENT_MAX_BYTES)})` });
        continue;
      }

      setRow(index, { state: "uploading" });
      const path = `${subscriptionId}/${batchId}/${crypto.randomUUID().slice(0, 8)}-${storageSafeName(file.name)}`;
      const { error } = await storage.upload(path, file, { contentType: file.type, upsert: false });
      if (error) {
        setRow(index, { state: "error", message: "Upload failed" });
        continue;
      }

      const result = await registerUploadedItem(batchId, { path, name: file.name, type: file.type, size: file.size });
      if (result.error) {
        await storage.remove([path]);
        setRow(index, { state: "error", message: result.error });
      } else {
        setRow(index, { state: "done" });
      }
    }
    router.refresh();
  };

  const pick = (list: FileList | null) => {
    if (list?.length) void uploadAll(Array.from(list));
  };

  return (
    <div>
      <div
        onDragOver={(e) => { e.preventDefault(); setDragging(true); }}
        onDragLeave={() => setDragging(false)}
        onDrop={(e) => { e.preventDefault(); setDragging(false); pick(e.dataTransfer.files); }}
        className={`flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-6 py-8 text-center text-sm ${dragging ? "border-[#ed1c24] bg-red-50" : "border-black/10"}`}
      >
        <p className="font-semibold">Drop files here</p>
        <p className="text-xs text-black/50">Images, MP4/MOV video or PDF · up to {formatBytes(CONTENT_MAX_BYTES)} each · saved as draft</p>
        <input
          ref={inputRef}
          type="file"
          multiple
          accept={CONTENT_MIME_TYPES.join(",")}
          className="hidden"
          data-testid="content-input"
          onChange={(e) => { pick(e.target.files); e.target.value = ""; }}
        />
        <button type="button" disabled={busy} onClick={() => inputRef.current?.click()} className="mt-1 rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {busy ? "Uploading…" : "Choose files"}
        </button>
      </div>
      {rows.length > 0 && (
        <ul className="mt-3 space-y-1 text-xs">
          {rows.map((row, i) => (
            <li key={i} className="flex justify-between gap-4">
              <span className="truncate">{row.name} <span className="text-black/40">{formatBytes(row.size)}</span></span>
              <span className={row.state === "error" ? "text-red-600" : row.state === "done" ? "text-green-700" : "text-black/50"}>
                {row.state === "error" ? row.message : row.state === "done" ? "Uploaded" : row.state === "uploading" ? "Uploading…" : "Waiting"}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
