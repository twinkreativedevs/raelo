import { asc, inArray } from "drizzle-orm";
import { Megaphone, Mail, PencilRuler, Palette, ShieldCheck, Briefcase } from "lucide-react";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import type { TeamRole } from "@/lib/db/types";
import { formatDate } from "@/lib/format";
import { ROLE_DESCRIPTIONS, ROLE_LABELS, TEAM_ROLES } from "@/lib/roles";
import { Avatar } from "@/components/app/avatar";
import { InviteForm } from "@/components/admin/invite-form";
import { MemberControls } from "@/components/admin/member-controls";
import { AdminPageHeader, EmptyState, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";

export const metadata = { title: "Team" };

const ROLE_ICONS: Record<TeamRole, typeof Mail> = {
  admin: ShieldCheck,
  account_manager: Briefcase,
  social_media_manager: Megaphone,
  content_creator: PencilRuler,
  designer: Palette,
  email_marketer: Mail,
};

export default async function TeamPage() {
  const { asUser, profile: me } = await requireStaff("/admin/team", ["admin"]);

  const { profiles: p, subscription_assignments } = schema;
  const [members, assignments] = await asUser((tx) =>
    Promise.all([
      tx
        .select({ id: p.id, full_name: p.full_name, email: p.email, phone: p.phone, role: p.role, is_active: p.is_active, created_at: p.created_at })
        .from(p)
        .where(inArray(p.role, TEAM_ROLES))
        .orderBy(asc(p.full_name)),
      tx.select({ profile_id: subscription_assignments.profile_id }).from(subscription_assignments),
    ]),
  );

  const load = new Map<string, number>();
  for (const a of assignments) load.set(a.profile_id, (load.get(a.profile_id) ?? 0) + 1);
  const byRole = new Map<string, number>();
  for (const m of members) if (m.is_active) byRole.set(m.role, (byRole.get(m.role) ?? 0) + 1);
  const sorted = [...members].sort(
    (a, b) => TEAM_ROLES.indexOf(a.role as TeamRole) - TEAM_ROLES.indexOf(b.role as TeamRole),
  );

  return (
    <>
      <AdminPageHeader
        title="Team"
        description="Invite the people who run Raelo. Everyone except admins only sees the clients you assign them, and never sees money."
      />

      <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
        {TEAM_ROLES.map((role) => {
          const Icon = ROLE_ICONS[role];
          const count = byRole.get(role) ?? 0;
          return (
            <div key={role} className="card flex gap-4 p-4">
              <span className={`flex h-11 w-11 shrink-0 items-center justify-center rounded-xl ${role === "admin" ? "bg-[#080d16] text-white" : "bg-[#fdeced] text-[#ed1c24]"}`}>
                <Icon className="h-5 w-5" />
              </span>
              <div className="min-w-0">
                <p className="flex items-baseline gap-2">
                  <span className="font-black tracking-tight">{ROLE_LABELS[role]}</span>
                  <span className="text-sm font-semibold text-black/40">{count}</span>
                </p>
                <p className="mt-0.5 text-xs leading-relaxed text-black/50">{ROLE_DESCRIPTIONS[role]}</p>
              </div>
            </div>
          );
        })}
      </div>

      <Panel title="Invite a team member">
        <InviteForm />
        <p className="mt-3 text-xs text-black/45">
          They get an email with a link to set their password (valid 24 hours), then sign in at /compass. Until email is connected, the link is shown here for you to send them. Assign them to clients from each client&apos;s page.
        </p>
      </Panel>

      <Panel title={`Members · ${members.length}`}>
        {sorted.length ? (
          <Table>
            <thead><tr><Th>Member</Th><Th>Role</Th><Th>Clients</Th><Th>Status</Th><Th>Added</Th><Th /></tr></thead>
            <tbody>
              {sorted.map((m) => {
                const Icon = ROLE_ICONS[m.role as TeamRole];
                return (
                  <tr key={m.id}>
                    <Td>
                      <div className="flex items-center gap-3">
                        <Avatar name={m.full_name || m.email} />
                        <div className="min-w-0">
                          <span className="block truncate font-bold">{m.full_name ?? "—"}</span>
                          <span className="block truncate text-xs text-black/50">{m.email}</span>
                        </div>
                      </div>
                    </Td>
                    <Td>
                      <span className="inline-flex items-center gap-1.5 rounded-full bg-black/[0.04] px-2.5 py-1 text-xs font-semibold">
                        {Icon && <Icon className="h-3.5 w-3.5 text-[#ed1c24]" />}
                        {ROLE_LABELS[m.role as TeamRole] ?? m.role}
                      </span>
                    </Td>
                    <Td className="tabular-nums">{load.get(m.id) ?? 0}</Td>
                    <Td><StatusBadge status={m.is_active ? "active" : "inactive"} /></Td>
                    <Td className="text-black/60">{formatDate(m.created_at)}</Td>
                    <Td>{m.id === me.id ? <span className="text-xs font-semibold text-black/40">You</span> : <MemberControls id={m.id} role={m.role} isActive={m.is_active} />}</Td>
                  </tr>
                );
              })}
            </tbody>
          </Table>
        ) : (
          <EmptyState>No team members yet.</EmptyState>
        )}
      </Panel>
    </>
  );
}
