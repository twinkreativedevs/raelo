"use client";

import { useState, useTransition } from "react";

import { createBatch } from "@/app/admin/content/actions";
import { inputClass } from "@/components/admin/ui";

export function NewBatchForm({
  subscriptions,
  defaultSubscriptionId,
}: {
  subscriptions: { id: string; label: string }[];
  defaultSubscriptionId?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const month = new Date().toLocaleDateString("en-GB", { month: "long", year: "numeric" });

  if (!subscriptions.length) return <p className="text-sm text-black/50">No active clients available to you.</p>;

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(fd) =>
        start(async () => {
          setError(null);
          // createBatch redirects on success; it only returns on error.
          const result = await createBatch(fd);
          if (result?.error) setError(result.error);
        })
      }
    >
      {subscriptions.length === 1 || defaultSubscriptionId ? (
        <input type="hidden" name="subscription_id" value={defaultSubscriptionId ?? subscriptions[0].id} />
      ) : (
        <select name="subscription_id" required defaultValue="" className={inputClass} aria-label="Client">
          <option value="" disabled>Client…</option>
          {subscriptions.map((s) => <option key={s.id} value={s.id}>{s.label}</option>)}
        </select>
      )}
      <input name="title" required defaultValue={`${month} content`} className={inputClass} aria-label="Batch title" />
      <button disabled={pending} className="h-9 rounded-lg bg-[#ed1c24] px-4 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Creating…" : "New batch"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
