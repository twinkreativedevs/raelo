import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { formatDate, formatMoney } from "@/lib/format";
import { cn } from "@/lib/utils";
import type { AffiliateBalance } from "@/lib/supabase/database.types";
import { PayoutRecordForm, RatesForm } from "@/components/admin/affiliate-forms";
import { ConfirmAction } from "@/components/admin/confirm-action";
import { AdminPageHeader, EmptyState, Panel, StatusBadge } from "@/components/admin/ui";
import { setAffiliateStatus } from "./actions";

export const metadata = { title: "Affiliates" };

const TABS = ["pending", "approved", "suspended", "rejected"] as const;

export default async function AffiliatesAdminPage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { supabase } = await requireStaff("/admin/affiliates", ["admin"]);
  const requested = (await searchParams).status;
  const status = TABS.find((t) => t === requested) ?? "approved";

  const [{ data: affiliates }, { data: balances }, { data: counts }, { data: threshold }] = await Promise.all([
    supabase
      .from("affiliates")
      .select("*, profiles!affiliates_user_id_fkey(full_name, email, phone)")
      .eq("status", status)
      .order("created_at", { ascending: false }),
    supabase.from("affiliate_balances").select("*"),
    supabase.from("affiliates").select("status"),
    supabase.from("settings").select("value").eq("key", "affiliate").maybeSingle(),
  ]);

  const balanceFor = (id: string) => (balances as AffiliateBalance[] | null)?.find((b) => b.affiliate_id === id);
  const countFor = (s: string) => (counts ?? []).filter((c) => c.status === s).length;
  const unlockAt = Number((threshold?.value as { unlock_threshold?: number } | null)?.unlock_threshold ?? 50);

  return (
    <>
      <AdminPageHeader title="Affiliates" description={`Commissions unlock after ${unlockAt} confirmed sales. Change the rules in Settings → Affiliates.`} />

      <div className="flex flex-wrap gap-1 text-sm font-semibold">
        {TABS.map((t) => (
          <Link key={t} href={`/admin/affiliates?status=${t}`} className={cn("rounded-lg px-3 py-1.5 capitalize", t === status ? "bg-[#111827] text-white" : "bg-white text-black/60 hover:text-black")}>
            {t} ({countFor(t)})
          </Link>
        ))}
      </div>

      {!affiliates?.length ? (
        <Panel><EmptyState>No {status} affiliates.</EmptyState></Panel>
      ) : (
        affiliates.map((a) => {
          const person = a.profiles as unknown as { full_name: string | null; email: string; phone: string | null } | null;
          const bal = balanceFor(a.id);
          const unpaid = Number(bal?.unpaid_total ?? 0);
          return (
            <Panel
              key={a.id}
              title={`${person?.full_name ?? person?.email} · ${a.code}`}
              action={<StatusBadge status={a.status} />}
            >
              <div className="grid gap-4 text-sm md:grid-cols-4">
                <div><p className="text-xs text-black/40">Contact</p><p>{person?.email}</p><p className="text-black/50">{person?.phone}</p></div>
                <div><p className="text-xs text-black/40">Sales</p><p className="font-semibold">{bal?.confirmed_sales ?? 0} / {unlockAt} {bal?.is_unlocked && <span className="text-green-700">· unlocked</span>}</p></div>
                <div><p className="text-xs text-black/40">Earned · paid · unpaid</p><p className="tabular-nums">{formatMoney(Number(bal?.earned_total ?? 0), "NGN")} · {formatMoney(Number(bal?.paid_total ?? 0), "NGN")} · <b>{formatMoney(unpaid, "NGN")}</b></p></div>
                <div><p className="text-xs text-black/40">Payout account</p><p>{a.bank_name ?? "—"} {a.account_number}</p><p className="text-black/50">{a.account_name}</p></div>
              </div>
              {a.application_note && <p className="mt-3 rounded-lg bg-black/5 px-3 py-2 text-sm text-black/70">“{a.application_note}”</p>}
              <p className="mt-2 text-xs text-black/40">Applied {formatDate(a.created_at)}{a.approved_at && ` · approved ${formatDate(a.approved_at)}`}</p>

              <div className="mt-4 flex flex-wrap gap-2">
                {a.status !== "approved" && <ConfirmAction label={a.status === "pending" ? "Approve" : "Reactivate"} tone="primary" action={setAffiliateStatus.bind(null, a.id, "approved")} />}
                {a.status === "pending" && <ConfirmAction label="Reject" tone="danger" confirm="Reject this application?" action={setAffiliateStatus.bind(null, a.id, "rejected")} />}
                {a.status === "approved" && <ConfirmAction label="Suspend" tone="danger" confirm="Suspend? Their link stops giving discounts and earning commission." action={setAffiliateStatus.bind(null, a.id, "suspended")} />}
              </div>

              <div className="mt-4 space-y-3 border-t border-black/5 pt-4">
                <RatesForm id={a.id} discount={Number(a.discount_percent)} commission={Number(a.commission_percent)} note={a.admin_note} />
                {a.status === "approved" && bal?.is_unlocked && unpaid > 0 && (
                  <PayoutRecordForm id={a.id} amountLabel={formatMoney(unpaid, "NGN")} />
                )}
              </div>
            </Panel>
          );
        })
      )}
    </>
  );
}
