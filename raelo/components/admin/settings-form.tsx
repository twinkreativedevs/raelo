"use client";

import { useState, useTransition } from "react";

import { saveSettings } from "@/app/admin/settings/actions";

export function SettingsForm({ settingKey, children }: { settingKey: string; children: React.ReactNode }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      className="space-y-4"
      // onSubmit (not `action`) so React doesn't reset the fields after saving.
      onSubmit={(e) => {
        e.preventDefault();
        const fd = new FormData(e.currentTarget);
        start(async () => {
          const result = await saveSettings(settingKey, fd);
          setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: "Saved." });
        });
      }}
    >
      {children}
      <div className="flex items-center gap-3">
        <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </form>
  );
}
