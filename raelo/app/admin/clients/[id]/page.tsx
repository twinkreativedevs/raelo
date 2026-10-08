import { and, asc, desc, eq, inArray, ne } from "drizzle-orm";
import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import type { TeamRole } from "@/lib/db/types";
import { TEAM_ROLES, roleLabel } from "@/lib/roles";
import { batchFileCounts } from "@/lib/content";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";
import { signBrandAssetUrl } from "@/lib/brand-assets";
import { clientLabel } from "@/lib/admin/subscriptions";
import { formatDate, formatMoney } from "@/lib/format";
import type { OnboardingResponse, Profile } from "@/lib/db/types";
import { AssignForm } from "@/components/admin/assign-form";
import { GrantSubscriptionForm } from "@/components/admin/grant-subscription-form";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { NewBatchForm } from "@/components/admin/new-batch-form";
import { AdminPageHeader, EmptyState, Panel, StatusBadge, Table, Td, Th } from "@/components/admin/ui";
import { removeAssignment, setSubscriptionStatus } from "../actions";

export const metadata = { title: "Client" };

function BriefRow({ label, value }: { label: string; value?: string | null }) {
  return (
    <div className="grid gap-1 border-b border-black/5 py-2 text-sm sm:grid-cols-[180px_1fr]">
      <dt className="text-black/50">{label}</dt>
      <dd className="whitespace-pre-line">{value || "—"}</dd>
    </div>
  );
}

export default async function ClientPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const { asUser, profile: me } = await requireStaff(`/admin/clients/${id}`);
  const isAdmin = me.role === "admin";
  if (!isUuid(id)) notFound();

  const { profiles, subscriptions, onboarding_responses, content_batches, orders: ord, invoices: inv, activity_events, packages: pkgs } = schema;

  const data = await asUser(async (tx) => {
    // RLS: team members only see clients assigned to them.
    const [client] = (await tx
      .select()
      .from(profiles)
      .where(and(eq(profiles.id, id), eq(profiles.role, "client")))) as Profile[];
    if (!client) return null;

    const [subs, [brief], batches, orders, invoices, activity, staff, packages] = await Promise.all([
      tx.query.subscriptions.findMany({
        where: and(eq(subscriptions.user_id, id), ne(subscriptions.status, "pending")),
        orderBy: [desc(subscriptions.created_at)],
        columns: { id: true, status: true, started_at: true, expires_at: true, auto_renew: true, renewal_failures: true, complimentary: true, created_at: true },
        with: {
          package: { columns: { name: true, price: true, currency: true } },
          subscription_assignments: {
            columns: { id: true, role: true, profile_id: true },
            with: { profile_profile_id: { columns: { full_name: true, email: true } } },
          },
        },
      }),
      tx.select().from(onboarding_responses).where(eq(onboarding_responses.user_id, id)) as Promise<OnboardingResponse[]>,
      tx
        .select({
          id: content_batches.id,
          title: content_batches.title,
          status: content_batches.status,
          published_at: content_batches.published_at,
          updated_at: content_batches.updated_at,
          subscription_id: content_batches.subscription_id,
        })
        .from(content_batches)
        .innerJoin(subscriptions, eq(subscriptions.id, content_batches.subscription_id))
        .where(eq(subscriptions.user_id, id))
        .orderBy(desc(content_batches.updated_at)),
      isAdmin
        ? tx
            .select({ id: ord.id, order_number: ord.order_number, status: ord.status, kind: ord.kind, amount: ord.amount, currency: ord.currency, created_at: ord.created_at })
            .from(ord)
            .where(eq(ord.user_id, id))
            .orderBy(desc(ord.created_at))
            .limit(20)
        : Promise.resolve(null),
      isAdmin
        ? tx
            .select({ id: inv.id, invoice_number: inv.invoice_number, total: inv.total, currency: inv.currency, status: inv.status, issued_at: inv.issued_at })
            .from(inv)
            .where(eq(inv.user_id, id))
            .orderBy(desc(inv.issued_at))
            .limit(20)
        : Promise.resolve(null),
      isAdmin
        ? tx
            .select({ id: activity_events.id, event_type: activity_events.event_type, created_at: activity_events.created_at })
            .from(activity_events)
            .where(eq(activity_events.user_id, id))
            .orderBy(desc(activity_events.created_at))
            .limit(15)
        : Promise.resolve(null),
      isAdmin
        ? tx
            .select({ id: profiles.id, full_name: profiles.full_name, email: profiles.email, role: profiles.role })
            .from(profiles)
            .where(and(inArray(profiles.role, TEAM_ROLES), eq(profiles.is_active, true)))
            .orderBy(asc(profiles.full_name))
        : Promise.resolve(null),
      isAdmin
        ? tx.select({ id: pkgs.id, name: pkgs.name }).from(pkgs).where(eq(pkgs.active, true)).orderBy(asc(pkgs.sort_order))
        : Promise.resolve(null),
    ]);
    const fileCounts = await batchFileCounts(tx, batches.map((b) => b.id));
    return { client, subs, brief, batches, orders, invoices, activity, staff, packages, fileCounts };
  });

  if (!data) notFound();
  const { client, subs, brief, batches, orders, invoices, activity, staff, packages, fileCounts } = data;

  const logoUrl = await signBrandAssetUrl(brief?.logo_path);
  const handles = (brief?.social_handles ?? {}) as Record<string, string>;
  const platforms = Array.isArray(brief?.social_platforms) ? (brief!.social_platforms as string[]) : [];
  const members = (staff ?? []).map((s) => ({ id: s.id, name: s.full_name ?? s.email ?? "Team member", role: s.role as TeamRole }));
  const workable = subs.filter((s) => s.status === "active" || s.status === "paused");

  return (
    <>
      <Link href="/admin/clients" className="text-sm font-semibold text-black/50 hover:text-black">← Clients</Link>
      <AdminPageHeader title={clientLabel(client)} description={`${client.full_name ?? ""} · ${client.email}${client.phone ? ` · ${client.phone}` : ""} · joined ${formatDate(client.created_at)}`} />

      <Panel title="Profile">
        <dl className="grid gap-x-6 gap-y-4 text-sm sm:grid-cols-2 lg:grid-cols-4">
          {[
            ["Account type", client.account_type === "organization" ? "Organization" : "Individual"],
            ["Organization", client.company_name],
            ["Job title", client.job_title],
            ["Industry", client.industry],
            ["Team size", client.team_size],
            ["Location", [client.city, client.country].filter(Boolean).join(", ")],
            ["Website", client.website],
            ["Phone", client.phone],
          ].map(([label, value]) => (
            <div key={label}>
              <dt className="text-xs font-semibold text-black/45">{label}</dt>
              <dd className="mt-0.5 break-words font-semibold">
                {label === "Website" && value && /^https?:\/\//i.test(value) ? (
                  <a href={value} target="_blank" rel="noopener noreferrer nofollow" className="text-[#ed1c24] hover:underline">
                    {value.replace(/^https?:\/\//, "")}
                  </a>
                ) : (
                  value || <span className="font-normal text-black/35">—</span>
                )}
              </dd>
            </div>
          ))}
        </dl>
        {client.bio && <p className="mt-4 border-t border-black/[0.06] pt-4 text-sm leading-relaxed text-black/65">{client.bio}</p>}
      </Panel>

      <Panel title="Subscriptions">
        {isAdmin && packages?.length ? (
          <div className="mb-4 border-b border-black/5 pb-4">
            <GrantSubscriptionForm clientId={client.id} packages={packages} />
          </div>
        ) : null}
        {subs.length ? (
          <div className="divide-y divide-black/5">
            {subs.map((sub) => {
              const pkg = sub.package;
              const assignments = sub.subscription_assignments.map((a) => ({ ...a, profiles: a.profile_profile_id }));
              return (
                <div key={sub.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-bold">{pkg?.name}</span>
                    {pkg && <span className="text-black/50">{formatMoney(pkg.price, pkg.currency)}/mo</span>}
                    <StatusBadge status={sub.status} />
                    {sub.complimentary && <span className="rounded-full bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-800">Free plan</span>}
                    <span className="text-black/60">
                      {formatDate(sub.started_at)} → {formatDate(sub.expires_at)} · auto-renew {sub.auto_renew ? "on" : "off"}
                      {sub.renewal_failures > 0 && <span className="text-red-600"> · {sub.renewal_failures} failed renewal attempt(s)</span>}
                    </span>
                  </div>
                  {isAdmin && (
                    <div className="flex flex-wrap gap-2">
                      {sub.status === "active" && <ConfirmAction label="Pause" confirm="Pause this subscription? Auto-renew keeps its setting." action={setSubscriptionStatus.bind(null, sub.id, "paused")} />}
                      {(sub.status === "paused" || sub.status === "expired") && <ConfirmAction label="Set active" action={setSubscriptionStatus.bind(null, sub.id, "active")} />}
                      {sub.status !== "cancelled" && <ConfirmAction label="Cancel" tone="danger" confirm="Cancel this subscription and turn off auto-renew?" action={setSubscriptionStatus.bind(null, sub.id, "cancelled")} />}
                    </div>
                  )}
                  <div className="flex flex-wrap items-center gap-2 text-sm">
                    <span className="text-black/50">Team:</span>
                    {assignments.length === 0 && <span className="text-black/40">nobody assigned</span>}
                    {assignments.map((a) => (
                      <span key={a.id} className="inline-flex items-center gap-2 rounded-full bg-black/5 px-3 py-1 text-xs">
                        {a.profiles?.full_name ?? a.profiles?.email} · {roleLabel(a.role).toLowerCase()}
                        {isAdmin && <ConfirmAction label="×" confirm="Remove this team member from the client?" action={removeAssignment.bind(null, a.id)} className="border-0 px-1 py-0" />}
                      </span>
                    ))}
                  </div>
                  {isAdmin && members.length > 0 && <AssignForm subscriptionId={sub.id} members={members} />}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState>No subscriptions yet.{isAdmin && " Use “Give free plan” to activate one without payment."}</EmptyState>
        )}
      </Panel>

      <Panel title="Brand brief" action={brief?.completed ? <StatusBadge status="approved" /> : <StatusBadge status="pending" />}>
        {brief ? (
          <div className="grid gap-6 md:grid-cols-[140px_1fr]">
            <div className="flex aspect-square items-center justify-center overflow-hidden rounded-xl border border-black/10 bg-white">
              {logoUrl ? (
                <a href={logoUrl} target="_blank" rel="noreferrer" title="Open logo">
                  {/* eslint-disable-next-line @next/next/no-img-element -- short-lived signed URL */}
                  <img src={logoUrl} alt="Client logo" className="h-full w-full object-contain p-2" />
                </a>
              ) : (
                <span className="text-xs text-black/30">No logo</span>
              )}
            </div>
            <dl>
              <BriefRow label="Business" value={brief.business_name} />
              <BriefRow label="Industry" value={brief.industry} />
              <BriefRow label="Target audience" value={brief.target_audience} />
              <BriefRow label="Brand voice" value={brief.brand_voice} />
              <BriefRow label="Colours" value={brief.brand_colors} />
              <BriefRow label="Competitors" value={brief.competitors} />
              <BriefRow label="Goals" value={brief.content_goals} />
              <BriefRow label="Platforms" value={platforms.map((p) => (handles[p] ? `${p}: ${handles[p]}` : p)).join("\n")} />
              <div className="grid gap-1 py-2 text-sm sm:grid-cols-[180px_1fr]">
                <dt className="text-black/50">More assets</dt>
                <dd>
                  {brief.assets_url && /^https?:\/\//i.test(brief.assets_url) ? (
                    <a href={brief.assets_url} target="_blank" rel="noreferrer noopener" className="break-all text-[#ed1c24] underline">{brief.assets_url}</a>
                  ) : "—"}
                </dd>
              </div>
            </dl>
          </div>
        ) : (
          <EmptyState>The client hasn&apos;t started their brief.</EmptyState>
        )}
      </Panel>

      <Panel title="Content">
        {workable.length > 0 && (
          <div className="mb-4">
            <NewBatchForm subscriptions={workable.map((s) => ({ id: s.id, label: s.package?.name ?? "Subscription" }))} defaultSubscriptionId={workable.length === 1 ? workable[0].id : undefined} />
          </div>
        )}
        {batches.length ? (
          <ul className="divide-y divide-black/5 text-sm">
            {batches.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/content/${b.id}`} className="flex items-center justify-between gap-4 py-2 hover:text-[#ed1c24]">
                  <span className="font-semibold">{b.title}</span>
                  <span className="flex items-center gap-3 text-black/50">
                    {fileCounts.get(b.id) ?? 0} files
                    <StatusBadge status={b.status} />
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        ) : (
          <EmptyState>No content batches yet.</EmptyState>
        )}
      </Panel>

      {isAdmin && (
        <div className="grid gap-6 lg:grid-cols-2">
          <Panel title="Orders">
            {orders?.length ? (
              <Table>
                <thead><tr><Th>Order</Th><Th>Status</Th><Th className="text-right">Amount</Th><Th>Date</Th></tr></thead>
                <tbody>
                  {orders.map((o) => (
                    <tr key={o.id}>
                      <Td className="font-semibold">{o.order_number}{o.kind === "renewal" && <span className="ml-1 text-xs font-normal text-black/40">renewal</span>}</Td>
                      <Td><StatusBadge status={o.status} /></Td>
                      <Td className="text-right tabular-nums">{formatMoney(o.amount, o.currency)}</Td>
                      <Td className="text-black/60">{formatDate(o.created_at)}</Td>
                    </tr>
                  ))}
                </tbody>
              </Table>
            ) : <EmptyState>No orders.</EmptyState>}
          </Panel>
          <Panel title="Invoices">
            {invoices?.length ? (
              <ul className="divide-y divide-black/5 text-sm">
                {invoices.map((i) => (
                  <li key={i.id} className="flex items-center justify-between gap-3 py-2">
                    <a href={`/api/invoices/${i.id}`} className="font-semibold text-[#ed1c24]">{i.invoice_number}</a>
                    {i.status === "void" && <StatusBadge status="void" />}
                    <span className="tabular-nums">{formatMoney(i.total, i.currency)}</span>
                    <span className="text-black/50">{formatDate(i.issued_at)}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState>No invoices.</EmptyState>}
          </Panel>
          <Panel title="Recent activity" className="lg:col-span-2">
            {activity?.length ? (
              <ul className="divide-y divide-black/5 text-sm">
                {activity.map((e) => (
                  <li key={e.id} className="flex justify-between py-2">
                    <span>{e.event_type.replace(/_/g, " ")}</span>
                    <span className="text-black/50">{new Date(e.created_at).toLocaleString("en-NG")}</span>
                  </li>
                ))}
              </ul>
            ) : <EmptyState>No activity yet.</EmptyState>}
          </Panel>
        </div>
      )}
    </>
  );
}
