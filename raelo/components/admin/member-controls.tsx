"use client";

import { useState, useTransition } from "react";

import { updateTeamMember } from "@/app/admin/team/actions";
import { ROLE_LABELS, TEAM_ROLES } from "@/lib/roles";
import { inputClass } from "@/components/admin/ui";

export function MemberControls({ id, role, isActive }: { id: string; role: string; isActive: boolean }) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const run = (change: { role?: string; is_active?: boolean }, confirmText?: string) => {
    if (confirmText && !window.confirm(confirmText)) return;
    start(async () => {
      const result = await updateTeamMember(id, change);
      setError(result.error ?? null);
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      <select
        defaultValue={role}
        disabled={pending}
        aria-label="Role"
        className={inputClass}
        onChange={(e) => run({ role: e.target.value }, e.target.value === "client" ? "Remove from the team? They keep a client login and lose all assignments." : undefined)}
      >
        {TEAM_ROLES.map((r) => (
          <option key={r} value={r}>{ROLE_LABELS[r]}</option>
        ))}
        <option value="client">Remove from team</option>
      </select>
      <button
        type="button"
        disabled={pending}
        onClick={() => run({ is_active: !isActive }, isActive ? "Deactivate? They lose access immediately." : undefined)}
        className={`h-9 rounded-lg px-3 text-xs font-semibold ${isActive ? "border border-red-200 text-red-700" : "border border-black/10"}`}
      >
        {isActive ? "Deactivate" : "Reactivate"}
      </button>
      {error && <span className="w-full text-right text-xs text-red-600">{error}</span>}
    </div>
  );
}
