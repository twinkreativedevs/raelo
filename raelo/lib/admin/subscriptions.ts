import "server-only";

import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

export function clientLabel(p: { company_name?: string | null; full_name?: string | null; email?: string | null } | null) {
  return p?.company_name || p?.full_name || p?.email || "Client";
}

/** Active/paused subscriptions the signed-in staff member can see (RLS). */
export async function workableSubscriptions(supabase: Client) {
  const { data } = await supabase
    .from("subscriptions")
    .select("id, user_id, packages(name), profiles(full_name, company_name, email)")
    .in("status", ["active", "paused"])
    .order("created_at", { ascending: false });

  return (data ?? []).map((s) => {
    const profile = s.profiles as unknown as { full_name: string | null; company_name: string | null; email: string } | null;
    const pkg = s.packages as unknown as { name: string } | null;
    return { id: s.id, userId: s.user_id, label: `${clientLabel(profile)} · ${pkg?.name ?? ""}` };
  });
}
