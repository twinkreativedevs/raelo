"use client";

import { useState, useTransition } from "react";

import { deleteItem, moveItem, updateItem } from "@/app/admin/content/actions";
import { CONTENT_TYPES, PLATFORMS } from "@/lib/content-upload";
import { formatBytes } from "@/lib/format";
import { inputClass } from "@/components/admin/ui";

export interface EditableItem {
  id: string;
  title: string;
  caption: string | null;
  platform: string | null;
  content_type: string | null;
  scheduled_for: string | null;
  mime_type: string | null;
  file_name: string | null;
  file_size_bytes: number | null;
}

export function ItemEditor({
  item,
  previewUrl,
  isFirst,
  isLast,
}: {
  item: EditableItem;
  previewUrl?: string;
  isFirst: boolean;
  isLast: boolean;
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const run = (fn: () => Promise<{ error?: string; ok?: boolean }>, ok?: string) =>
    start(async () => {
      const result = await fn();
      setMessage(result.error ?? ok ?? null);
    });

  return (
    <li className="grid gap-4 border-b border-black/5 py-4 last:border-0 md:grid-cols-[120px_1fr]" data-testid="content-item">
      <div className="flex aspect-square items-center justify-center overflow-hidden rounded-lg bg-black/5 text-xs font-semibold uppercase text-black/30">
        {previewUrl && item.mime_type?.startsWith("image/") ? (
          // eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL
          <img src={previewUrl} alt="" className="h-full w-full object-cover" />
        ) : previewUrl && item.mime_type?.startsWith("video/") ? (
          <video src={previewUrl} className="h-full w-full object-cover" preload="metadata" muted />
        ) : (
          item.mime_type?.split("/")[1] ?? "file"
        )}
      </div>

      <form
        className="grid gap-2 md:grid-cols-4"
        // onSubmit (not `action`) so React doesn't reset the fields after saving.
        onSubmit={(e) => {
          e.preventDefault();
          const fd = new FormData(e.currentTarget);
          run(() => updateItem(item.id, Object.fromEntries(fd)), "Saved.");
        }}
      >
        <input name="title" defaultValue={item.title} required aria-label="Title" className={`${inputClass} md:col-span-2`} />
        <select name="platform" defaultValue={item.platform ?? ""} aria-label="Platform" className={inputClass}>
          <option value="">Platform…</option>
          {PLATFORMS.map((p) => <option key={p}>{p}</option>)}
        </select>
        <select name="content_type" defaultValue={item.content_type ?? ""} aria-label="Type" className={inputClass}>
          <option value="">Type…</option>
          {CONTENT_TYPES.map((t) => <option key={t}>{t}</option>)}
        </select>
        <textarea name="caption" defaultValue={item.caption ?? ""} placeholder="Caption (the client can copy it)" aria-label="Caption" rows={2} className={`${inputClass} h-auto py-2 md:col-span-3`} />
        <label className="grid gap-1 text-xs text-black/50">
          Post on
          <input type="date" name="scheduled_for" defaultValue={item.scheduled_for?.slice(0, 10) ?? ""} className={inputClass} />
        </label>
        <div className="flex flex-wrap items-center gap-2 md:col-span-4">
          <button disabled={pending} className="h-8 rounded-lg bg-[#111827] px-3 text-xs font-semibold text-white disabled:opacity-50">Save</button>
          <button type="button" disabled={pending || isFirst} onClick={() => run(() => moveItem(item.id, "up"))} className="h-8 rounded-lg border border-black/10 px-2 text-xs disabled:opacity-30" aria-label="Move up">↑</button>
          <button type="button" disabled={pending || isLast} onClick={() => run(() => moveItem(item.id, "down"))} className="h-8 rounded-lg border border-black/10 px-2 text-xs disabled:opacity-30" aria-label="Move down">↓</button>
          <button
            type="button"
            disabled={pending}
            onClick={() => { if (window.confirm(`Delete “${item.title}”? This removes the file.`)) run(() => deleteItem(item.id)); }}
            className="h-8 rounded-lg border border-red-200 px-3 text-xs font-semibold text-red-700 disabled:opacity-50"
          >
            Delete
          </button>
          <span className="text-xs text-black/40">{item.file_name} · {formatBytes(item.file_size_bytes)}</span>
          {message && <span className={message === "Saved." ? "text-xs text-green-700" : "text-xs text-red-600"}>{message}</span>}
        </div>
      </form>
    </li>
  );
}
