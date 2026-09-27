"use client";

import { useRef, useState, useTransition } from "react";

import { inviteTeamMember } from "@/app/admin/team/actions";
import { inputClass } from "@/components/admin/ui";

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      ref={formRef}
      className="flex flex-wrap items-end gap-2"
      action={(fd) =>
        start(async () => {
          const result = await inviteTeamMember(fd);
          setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: result.message ?? "Done." });
          if (!result.error) formRef.current?.reset();
        })
      }
    >
      <input name="full_name" placeholder="Full name" className={inputClass} aria-label="Full name" />
      <input name="email" type="email" required placeholder="email@company.com" className={inputClass} aria-label="Email" />
      <select name="role" required defaultValue="designer" className={inputClass} aria-label="Role">
        <option value="designer">Designer</option>
        <option value="account_manager">Account manager</option>
        <option value="admin">Admin</option>
      </select>
      <button disabled={pending} className="h-9 rounded-lg bg-[#ed1c24] px-4 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Sending…" : "Send invite"}
      </button>
      {message && <p className={`w-full text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</p>}
    </form>
  );
}
