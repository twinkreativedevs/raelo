import { requireStaff } from "@/lib/auth";
import { formatDate } from "@/lib/format";
import { InviteForm } from "@/components/admin/invite-form";
import { MemberControls } from "@/components/admin/member-controls";
import { AdminPageHeader, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Team" };

export default async function TeamPage() {
  const { supabase, profile: me } = await requireStaff("/admin/team", ["admin"]);

  const [{ data: members }, { data: assignments }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, email, phone, role, is_active, created_at")
      .in("role", ["admin", "account_manager", "designer"])
      .order("role")
      .order("full_name"),
    supabase.from("subscription_assignments").select("profile_id"),
  ]);

  const load = new Map<string, number>();
  for (const a of assignments ?? []) load.set(a.profile_id, (load.get(a.profile_id) ?? 0) + 1);

  return (
    <>
      <AdminPageHeader title="Team" description="Designers upload drafts for their assigned clients. Account managers can also publish. Admins can do everything." />

      <Panel title="Invite a team member">
        <InviteForm />
        <p className="mt-2 text-xs text-black/50">
          They get an email from Supabase with a link to set their password, then sign in at /auth/login and land on /admin.
        </p>
      </Panel>

      <Panel title="Members">
        <Table>
          <thead><tr><Th>Name</Th><Th>Role</Th><Th>Clients</Th><Th>Status</Th><Th>Added</Th><Th /></tr></thead>
          <tbody>
            {(members ?? []).map((m) => (
              <tr key={m.id}>
                <Td>
                  <span className="font-semibold">{m.full_name ?? "—"}</span>
                  <span className="block text-xs text-black/50">{m.email}</span>
                </Td>
                <Td className="capitalize">{m.role.replace("_", " ")}</Td>
                <Td className="tabular-nums">{load.get(m.id) ?? 0}</Td>
                <Td><StatusBadge status={m.is_active ? "active" : "inactive"} /></Td>
                <Td className="text-black/60">{formatDate(m.created_at)}</Td>
                <Td>{m.id === me.id ? <span className="text-xs text-black/40">You</span> : <MemberControls id={m.id} role={m.role} isActive={m.is_active} />}</Td>
              </tr>
            ))}
          </tbody>
        </Table>
      </Panel>
    </>
  );
}
