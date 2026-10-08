"use client";

import { useRef, useState, useTransition } from "react";
import { Loader2, Send } from "lucide-react";

import { inviteTeamMember } from "@/app/admin/team/actions";
import type { TeamRole } from "@/lib/db/types";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, TEAM_ROLES } from "@/lib/roles";

export function InviteForm() {
  const formRef = useRef<HTMLFormElement>(null);
  const [pending, start] = useTransition();
  const [role, setRole] = useState<TeamRole>("content_creator");
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);

  return (
    <form
      ref={formRef}
      className="space-y-4"
      action={(fd) =>
        start(async () => {
          const result = await inviteTeamMember(fd);
          setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: result.message ?? "Done." });
          if (!result.error) {
            formRef.current?.reset();
            setRole("content_creator");
          }
        })
      }
    >
      <div className="grid gap-4 md:grid-cols-3">
        <div>
          <label htmlFor="invite-name" className="field-label">Full name</label>
          <input id="invite-name" name="full_name" placeholder="Ada Okafor" className="field" />
        </div>
        <div>
          <label htmlFor="invite-email" className="field-label">Email</label>
          <input id="invite-email" name="email" type="email" required placeholder="ada@helloraelo.com" className="field" />
        </div>
        <div>
          <label htmlFor="invite-role" className="field-label">Role</label>
          <select
            id="invite-role"
            name="role"
            required
            value={role}
            onChange={(e) => setRole(e.target.value as TeamRole)}
            className="field"
          >
            {TEAM_ROLES.map((r) => (
              <option key={r} value={r}>{ROLE_LABELS[r]}</option>
            ))}
          </select>
        </div>
      </div>

      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl bg-black/[0.03] px-4 py-3">
        <p className="text-sm text-black/60">
          <span className="font-bold text-[#080d16]">{ROLE_LABELS[role]}:</span> {ROLE_DESCRIPTIONS[role]}
        </p>
        <button disabled={pending} className="btn-primary">
          {pending ? <Loader2 className="h-4 w-4 animate-spin" /> : <Send className="h-4 w-4" />}
          {pending ? "Sending…" : "Send invite"}
        </button>
      </div>

      {message && (
        <p role="status" className={`break-all text-sm font-semibold ${message.ok ? "text-green-700" : "text-[#c4161c]"}`}>
          {message.text}
        </p>
      )}
    </form>
  );
}
