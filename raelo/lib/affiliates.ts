import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

const { affiliates, commissions, settings } = schema;

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
  const [data] = await db.select({ value: settings.value }).from(settings).where(eq(settings.key, "affiliate"));
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

  const [affiliate] = await db
    .select({
      id: affiliates.id,
      user_id: affiliates.user_id,
      code: affiliates.code,
      discount_percent: affiliates.discount_percent,
      status: affiliates.status,
    })
    .from(affiliates)
    .where(eq(affiliates.code, code));

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

  const [affiliate] = await db
    .select({
      id: affiliates.id,
      user_id: affiliates.user_id,
      status: affiliates.status,
      commission_percent: affiliates.commission_percent,
    })
    .from(affiliates)
    .where(eq(affiliates.id, order.affiliate_id));
  if (!affiliate || affiliate.status !== "approved") return null;

  const rate = Number(affiliate.commission_percent);
  const amount = Math.round((Number(order.amount) * rate) / 100);

  try {
    const [created] = await db
      .insert(commissions)
      .values({
        affiliate_id: affiliate.id,
        order_id: order.id,
        base_amount: order.amount,
        rate_percent: rate,
        amount,
        currency: order.currency,
        status: "earned",
      })
      .onConflictDoNothing({ target: commissions.order_id })
      .returning({ id: commissions.id, amount: commissions.amount });
    return created ? { ...created, affiliateUserId: affiliate.user_id } : null;
  } catch (error) {
    console.error("recordCommission failed", order.id, error);
    return null;
  }
}
