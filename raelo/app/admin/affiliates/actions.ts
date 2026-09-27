"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { afterResponse, notifyUser } from "@/lib/notifications";

const STATUSES = ["approved", "rejected", "suspended", "pending"] as const;

export async function setAffiliateStatus(affiliateId: string, status: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };

  const { data: current } = await auth.supabase.from("affiliates").select("approved_at").eq("id", affiliateId).maybeSingle();
  const firstApproval = status === "approved" && !current?.approved_at;

  const { data, error } = await auth.supabase
    .from("affiliates")
    .update({
      status,
      ...(firstApproval ? { approved_at: new Date().toISOString(), approved_by: auth.profile.id } : {}),
    })
    .eq("id", affiliateId)
    .select("id, user_id, code, discount_percent, commission_percent")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update the affiliate." };

  await logActivity(data.user_id, `affiliate_${status}`, { affiliate_id: data.id, by: auth.profile.id });
  if (firstApproval) {
    await afterResponse(() =>
      notifyUser("affiliate_approved", data.user_id, {
        code: data.code,
        discount: Number(data.discount_percent),
        commission: Number(data.commission_percent),
      }),
    );
  }
  revalidatePath("/admin/affiliates");
  return { ok: true as const };
}

export async function updateAffiliateRates(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const id = String(formData.get("id") ?? "");
  const discount = Number(formData.get("discount_percent"));
  const commission = Number(formData.get("commission_percent"));
  const valid = (n: number) => Number.isFinite(n) && n >= 0 && n <= 100;
  if (!id || !valid(discount) || !valid(commission)) return { error: "Rates must be 0–100%." };

  const { error } = await auth.supabase
    .from("affiliates")
    .update({ discount_percent: discount, commission_percent: commission, admin_note: String(formData.get("admin_note") ?? "").slice(0, 1000) || null })
    .eq("id", id);
  if (error) return { error: "Couldn't save." };

  revalidatePath("/admin/affiliates");
  return { ok: true as const };
}

/** Pays out every earned commission (atomic; see record_affiliate_payout). */
export async function recordPayout(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const id = String(formData.get("id") ?? "");
  const { data: payout, error } = await auth.supabase
    .rpc("record_affiliate_payout", {
      target_affiliate: id,
      payout_method: String(formData.get("method") ?? "bank_transfer").slice(0, 40),
      payout_reference: String(formData.get("reference") ?? "").slice(0, 100),
      payout_notes: String(formData.get("notes") ?? "").slice(0, 500),
    })
    .single<{ id: string; amount: number; reference: string | null }>();

  if (error || !payout) return { error: error?.message ?? "Couldn't record the payout." };

  const { data: affiliate } = await auth.supabase.from("affiliates").select("user_id").eq("id", id).single();
  if (affiliate) {
    await logActivity(affiliate.user_id, "payout_recorded", { payout_id: payout.id, amount: payout.amount, by: auth.profile.id });
    await afterResponse(() =>
      notifyUser("payout_recorded", affiliate.user_id, { amount: Number(payout.amount), reference: payout.reference }),
    );
  }
  revalidatePath("/admin/affiliates");
  return { ok: true as const };
}
