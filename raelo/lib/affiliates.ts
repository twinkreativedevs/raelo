import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

// Referral attribution. The proxy stores `?ref=<code>` in a cookie as
// "<code>.<timestamp>" (last click wins). Checkout honours it only while
// it's younger than settings.affiliate.cookie_days and the affiliate is
// approved, and never for the affiliate's own purchases.

import { REF_CODE_PATTERN } from "@/lib/referral";

export { REF_COOKIE, REF_CODE_PATTERN } from "@/lib/referral";

export interface Referral {
  affiliateId: string;
  affiliateUserId: string;
  code: string;
  discountPercent: number;
}

export async function affiliateSettings() {
  const { data } = await createAdminClient().from("settings").select("value").eq("key", "affiliate").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, number>;
  return {
    unlockThreshold: Number(v.unlock_threshold ?? 50),
    defaultDiscount: Number(v.default_discount_percent ?? 10),
    defaultCommission: Number(v.default_commission_percent ?? 10),
    cookieDays: Number(v.cookie_days ?? 30),
  };
}

/** Resolves the referral cookie for a buyer, or null if it doesn't apply. */
export async function resolveReferral(
  cookieValue: string | undefined,
  buyerId: string | null,
): Promise<Referral | null> {
  if (!cookieValue) return null;
  const [code, stamp] = cookieValue.split(".");
  if (!code || !REF_CODE_PATTERN.test(code)) return null;

  const { cookieDays } = await affiliateSettings();
  const setAt = Number(stamp);
  if (!Number.isFinite(setAt) || Date.now() - setAt > cookieDays * 86_400_000) return null;

  const { data: affiliate } = await createAdminClient()
    .from("affiliates")
    .select("id, user_id, code, discount_percent, status")
    .eq("code", code)
    .maybeSingle();

  if (!affiliate || affiliate.status !== "approved") return null;
  if (buyerId && affiliate.user_id === buyerId) return null;

  return {
    affiliateId: affiliate.id,
    affiliateUserId: affiliate.user_id,
    code: affiliate.code,
    discountPercent: Number(affiliate.discount_percent),
  };
}

/** Discount in whole naira. */
export function referralDiscount(price: number, percent: number) {
  return Math.min(price, Math.round((price * percent) / 100));
}

/**
 * Creates the commission for a paid referred order (first purchases only).
 * Idempotent: one commission per order. Returns it when newly created.
 */
export async function recordCommission(order: {
  id: string;
  kind: string;
  amount: number;
  currency: string;
  affiliate_id?: string | null;
}) {
  if (!order.affiliate_id || order.kind !== "new") return null;

  const admin = createAdminClient();
  const { data: affiliate } = await admin
    .from("affiliates")
    .select("id, user_id, status, commission_percent")
    .eq("id", order.affiliate_id)
    .maybeSingle();
  if (!affiliate || affiliate.status !== "approved") return null;

  const rate = Number(affiliate.commission_percent);
  const amount = Math.round((Number(order.amount) * rate) / 100);

  const { data, error } = await admin
    .from("commissions")
    .upsert(
      {
        affiliate_id: affiliate.id,
        order_id: order.id,
        base_amount: order.amount,
        rate_percent: rate,
        amount,
        currency: order.currency,
        status: "earned",
      },
      { onConflict: "order_id", ignoreDuplicates: true },
    )
    .select("id, amount")
    .maybeSingle();

  if (error) {
    console.error("recordCommission failed", order.id, error.message);
    return null;
  }
  return data ? { ...data, affiliateUserId: affiliate.user_id } : null;
}
