"use server";

import { eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";

const { affiliates } = schema;
import { afterResponse, notifyUser } from "@/lib/notifications";

const STATUSES = ["approved", "rejected", "suspended", "pending"] as const;

export async function setAffiliateStatus(affiliateId: string, status: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (!(STATUSES as readonly string[]).includes(status)) return { error: "Invalid status." };
  if (!isUuid(affiliateId)) return { error: "Couldn't update the affiliate." };

  const result = await auth.asUser(async (tx) => {
    const [current] = await tx.select({ approved_at: affiliates.approved_at }).from(affiliates).where(eq(affiliates.id, affiliateId));
    const firstApproval = status === "approved" && !current?.approved_at;
    const [row] = await tx
      .update(affiliates)
      .set({
        status,
        ...(firstApproval ? { approved_at: new Date().toISOString(), approved_by: auth.profile.id } : {}),
      })
      .where(eq(affiliates.id, affiliateId))
      .returning({
        id: affiliates.id,
        user_id: affiliates.user_id,
        code: affiliates.code,
        discount_percent: affiliates.discount_percent,
        commission_percent: affiliates.commission_percent,
      });
    return row ? { data: row, firstApproval } : null;
  }).catch(() => null);

  if (!result) return { error: "Couldn't update the affiliate." };
  const { data, firstApproval } = result;

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
  if (!isUuid(id) || !valid(discount) || !valid(commission)) return { error: "Rates must be 0–100%." };

  const saved = await auth.asUser((tx) =>
    tx
      .update(affiliates)
      .set({ discount_percent: discount, commission_percent: commission, admin_note: String(formData.get("admin_note") ?? "").slice(0, 1000) || null })
      .where(eq(affiliates.id, id))
      .returning({ id: affiliates.id }),
  ).catch(() => []);
  if (!saved.length) return { error: "Couldn't save." };

  revalidatePath("/admin/affiliates");
  return { ok: true as const };
}

/** Pays out every earned commission (atomic; see record_affiliate_payout). */
export async function recordPayout(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const id = String(formData.get("id") ?? "");
  if (!isUuid(id)) return { error: "Couldn't record the payout." };
  const method = String(formData.get("method") ?? "bank_transfer").slice(0, 40);
  const reference = String(formData.get("reference") ?? "").slice(0, 100);
  const notes = String(formData.get("notes") ?? "").slice(0, 500);

  let payout: { id: string; amount: number; reference: string | null } | undefined;
  let affiliate: { user_id: string } | undefined;
  try {
    ({ payout, affiliate } = await auth.asUser(async (tx) => {
      const { rows } = await tx.execute<{ id: string; amount: string; reference: string | null }>(
        sql`select id, amount, reference from public.record_affiliate_payout(${id}::uuid, ${method}, ${reference}, ${notes})`,
      );
      const [aff] = await tx.select({ user_id: affiliates.user_id }).from(affiliates).where(eq(affiliates.id, id));
      return { payout: rows[0] ? { ...rows[0], amount: Number(rows[0].amount) } : undefined, affiliate: aff };
    }));
  } catch (error) {
    // The function raises a readable message (e.g. "Nothing to pay out").
    const cause = (error as { cause?: { message?: string } }).cause;
    return { error: cause?.message ?? "Couldn't record the payout." };
  }
  if (!payout) return { error: "Couldn't record the payout." };
  if (affiliate) {
    await logActivity(affiliate.user_id, "payout_recorded", { payout_id: payout.id, amount: payout.amount, by: auth.profile.id });
    await afterResponse(() =>
      notifyUser("payout_recorded", affiliate.user_id, { amount: Number(payout.amount), reference: payout.reference }),
    );
  }
  revalidatePath("/admin/affiliates");
  return { ok: true as const };
}
