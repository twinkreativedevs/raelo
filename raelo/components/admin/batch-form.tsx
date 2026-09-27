"use client";

import { useState, useTransition } from "react";

import { updateBatch } from "@/app/admin/content/actions";
import { inputClass } from "@/components/admin/ui";

export function BatchForm({
  batch,
}: {
  batch: { id: string; title: string; period_start: string | null; client_message: string | null; internal_notes: string | null };
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 md:grid-cols-2"
      // onSubmit (not `action`) so React doesn't reset the fields after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await updateBatch(batch.id, Object.fromEntries(fd));
          setMessage(result.error ?? "Saved.");
        });
      }}
    >
      <label className="grid gap-1 text-sm font-semibold">
        Title
        <input name="title" defaultValue={batch.title} required className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Month starting
        <input type="date" name="period_start" defaultValue={batch.period_start ?? ""} className={inputClass} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Message to client <span className="text-xs font-normal text-black/50">Shown on the batch page when published</span>
        <textarea name="client_message" defaultValue={batch.client_message ?? ""} rows={3} className={`${inputClass} h-auto py-2`} />
      </label>
      <label className="grid gap-1 text-sm font-semibold">
        Internal notes <span className="text-xs font-normal text-black/50">Team only</span>
        <textarea name="internal_notes" defaultValue={batch.internal_notes ?? ""} rows={3} className={`${inputClass} h-auto py-2`} />
      </label>
      <div className="flex items-center gap-3 md:col-span-2">
        <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save details"}
        </button>
        {message && <span className={message === "Saved." ? "text-sm text-green-700" : "text-sm text-red-600"}>{message}</span>}
      </div>
    </form>
  );
}
