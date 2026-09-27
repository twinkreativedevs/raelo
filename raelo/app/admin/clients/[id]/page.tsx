import Link from "next/link";
import { notFound } from "next/navigation";

import { requireStaff } from "@/lib/auth";
import { signBrandAssetUrl } from "@/lib/brand-assets";
import { clientLabel } from "@/lib/admin/subscriptions";
import { formatDate, formatMoney } from "@/lib/format";
import type { OnboardingResponse, Profile } from "@/lib/supabase/database.types";
import { AssignForm } from "@/components/admin/assign-form";
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
  const { supabase, profile: me } = await requireStaff(`/admin/clients/${id}`);
  const isAdmin = me.role === "admin";

  // RLS: team members only see clients assigned to them.
  const { data: client } = await supabase.from("profiles").select("*").eq("id", id).eq("role", "client").maybeSingle<Profile>();
  if (!client) notFound();

  const [{ data: subs }, { data: brief }, { data: batches }, { data: orders }, { data: invoices }, { data: activity }, { data: staff }] =
    await Promise.all([
      supabase
        .from("subscriptions")
        .select("id, status, started_at, expires_at, auto_renew, renewal_failures, created_at, packages(name, price, currency), subscription_assignments(id, role, profile_id, profiles!subscription_assignments_profile_id_fkey(full_name, email))")
        .eq("user_id", id)
        .neq("status", "pending")
        .order("created_at", { ascending: false }),
      supabase.from("onboarding_responses").select("*").eq("user_id", id).maybeSingle<OnboardingResponse>(),
      supabase
        .from("content_batches")
        .select("id, title, status, published_at, updated_at, subscription_id, content_items(count), subscriptions!inner(user_id)")
        .eq("subscriptions.user_id", id)
        .order("updated_at", { ascending: false }),
      isAdmin
        ? supabase.from("orders").select("id, order_number, status, kind, amount, currency, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(20)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase.from("invoices").select("id, invoice_number, total, currency, status, issued_at").eq("user_id", id).order("issued_at", { ascending: false }).limit(20)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase.from("activity_events").select("id, event_type, created_at").eq("user_id", id).order("created_at", { ascending: false }).limit(15)
        : Promise.resolve({ data: null }),
      isAdmin
        ? supabase.from("profiles").select("id, full_name, email, role").in("role", ["admin", "account_manager", "designer"]).eq("is_active", true).order("full_name")
        : Promise.resolve({ data: null }),
    ]);

  const logoUrl = await signBrandAssetUrl(supabase, brief?.logo_path);
  const handles = (brief?.social_handles ?? {}) as Record<string, string>;
  const platforms = Array.isArray(brief?.social_platforms) ? (brief!.social_platforms as string[]) : [];
  const members = (staff ?? []).map((s) => ({ id: s.id, name: s.full_name ?? s.email ?? "Team member", role: s.role as "admin" | "designer" | "account_manager" }));
  const workable = (subs ?? []).filter((s) => s.status === "active" || s.status === "paused");

  return (
    <>
      <Link href="/admin/clients" className="text-sm font-semibold text-black/50 hover:text-black">← Clients</Link>
      <AdminPageHeader title={clientLabel(client)} description={`${client.full_name ?? ""} · ${client.email}${client.phone ? ` · ${client.phone}` : ""} · joined ${formatDate(client.created_at)}`} />

      <Panel title="Subscriptions">
        {subs?.length ? (
          <div className="divide-y divide-black/5">
            {subs.map((sub) => {
              const pkg = sub.packages as unknown as { name: string; price: number; currency: string } | null;
              const assignments = (sub.subscription_assignments ?? []) as unknown as { id: string; role: string; profiles: { full_name: string | null; email: string } | null }[];
              return (
                <div key={sub.id} className="space-y-3 py-4 first:pt-0 last:pb-0">
                  <div className="flex flex-wrap items-center gap-3 text-sm">
                    <span className="font-bold">{pkg?.name}</span>
                    {pkg && <span className="text-black/50">{formatMoney(pkg.price, pkg.currency)}/mo</span>}
                    <StatusBadge status={sub.status} />
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
                        {a.profiles?.full_name ?? a.profiles?.email} · {a.role.replace("_", " ")}
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
          <EmptyState>No paid subscriptions.</EmptyState>
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
            <NewBatchForm subscriptions={workable.map((s) => ({ id: s.id, label: (s.packages as unknown as { name: string } | null)?.name ?? "Subscription" }))} defaultSubscriptionId={workable.length === 1 ? workable[0].id : undefined} />
          </div>
        )}
        {batches?.length ? (
          <ul className="divide-y divide-black/5 text-sm">
            {batches.map((b) => (
              <li key={b.id}>
                <Link href={`/admin/content/${b.id}`} className="flex items-center justify-between gap-4 py-2 hover:text-[#ed1c24]">
                  <span className="font-semibold">{b.title}</span>
                  <span className="flex items-center gap-3 text-black/50">
                    {(b.content_items as unknown as { count: number }[])[0]?.count ?? 0} files
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
