import "server-only";

import { desc, inArray } from "drizzle-orm";

import { schema, type Tx } from "@/lib/db";

export function clientLabel(p: { company_name?: string | null; full_name?: string | null; email?: string | null } | null | undefined) {
  return p?.company_name || p?.full_name || p?.email || "Client";
}

/** Active/paused subscriptions the signed-in staff member can see (RLS). */
export async function workableSubscriptions(tx: Tx) {
  const rows = await tx.query.subscriptions.findMany({
    where: inArray(schema.subscriptions.status, ["active", "paused"]),
    orderBy: [desc(schema.subscriptions.created_at)],
    columns: { id: true, user_id: true },
    with: {
      package: { columns: { name: true } },
      profile: { columns: { full_name: true, company_name: true, email: true } },
    },
  });

  return rows.map((s) => ({
    id: s.id,
    userId: s.user_id,
    label: `${clientLabel(s.profile)} · ${s.package?.name ?? ""}`,
  }));
}
