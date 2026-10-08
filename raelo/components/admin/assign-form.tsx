"use client";

import { useState, useTransition } from "react";

import { assignTeamMember } from "@/app/admin/clients/actions";
import type { TeamRole } from "@/lib/db/types";
import { ASSIGNMENT_ROLES, ROLE_LABELS } from "@/lib/roles";
import { inputClass } from "@/components/admin/ui";

export function AssignForm({
  subscriptionId,
  members,
}: {
  subscriptionId: string;
  members: { id: string; name: string; role: TeamRole }[];
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <form
      className="flex flex-wrap items-center gap-2"
      action={(formData) =>
        start(async () => {
          setError(null);
          const result = await assignTeamMember(formData);
          if (result.error) setError(result.error);
        })
      }
    >
      <input type="hidden" name="subscription_id" value={subscriptionId} />
      <select name="member" required defaultValue="" className={inputClass} aria-label="Team member">
        <option value="" disabled>Assign team member…</option>
        {members.map((m) =>
          m.role === "admin" ? (
            ASSIGNMENT_ROLES.map((r) => (
              <option key={`${m.id}:${r}`} value={`${m.id}:${r}`}>{m.name} (admin, as {ROLE_LABELS[r].toLowerCase()})</option>
            ))
          ) : (
            <option key={m.id} value={`${m.id}:${m.role}`}>{m.name} ({ROLE_LABELS[m.role].toLowerCase()})</option>
          ),
        )}
      </select>
      <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-3 text-sm font-semibold text-white disabled:opacity-50">
        {pending ? "Assigning…" : "Assign"}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </form>
  );
}
