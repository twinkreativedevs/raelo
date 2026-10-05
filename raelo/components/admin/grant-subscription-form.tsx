"use client";

import { useState, useTransition } from "react";

import { grantComplimentarySubscription } from "@/app/admin/clients/actions";
import { inputClass } from "@/components/admin/ui";

const DURATIONS = [
  { months: 1, label: "1 month" },
  { months: 3, label: "3 months" },
  { months: 6, label: "6 months" },
  { months: 12, label: "12 months" },
];

/** Admin: give a client an active plan without payment. */
export function GrantSubscriptionForm({
  clientId,
  packages,
}: {
  clientId: string;
  packages: { id: string; name: string }[];
}) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      onSubmit={(event) => {
        event.preventDefault();
        const formData = new FormData(event.currentTarget);
        start(async () => {
          setMessage(null);
          const result = await grantComplimentarySubscription(formData);
          setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Plan activated. The client can use their portal now." });
        });
      }}
    >
      <input type="hidden" name="client_id" value={clientId} />
      <select name="package_id" required defaultValue="" className={inputClass} aria-label="Package">
        <option value="" disabled>Package…</option>
        {packages.map((p) => (
          <option key={p.id} value={p.id}>{p.name}</option>
        ))}
      </select>
      <select name="months" defaultValue="1" className={inputClass} aria-label="Duration">
        {DURATIONS.map((d) => (
          <option key={d.months} value={d.months}>{d.label}</option>
        ))}
      </select>
      <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-3 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Activating…" : "Give free plan"}
      </button>
      {message && <span className={`text-xs ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</span>}
    </form>
  );
}
