"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { affiliateSettings, REF_CODE_PATTERN } from "@/lib/affiliates";
import { afterResponse, notifyAdmins } from "@/lib/notifications";
import { getSessionUserId } from "@/lib/auth";
import { db, schema } from "@/lib/db";

// Affiliates can't write their own rows (RLS: admin only), so these actions
// authenticate the user and then write with the owner connection, touching
// only whitelisted columns.

const { affiliates, profiles } = schema;

const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);

function payoutFields(fd: FormData) {
  const accountNumber = str(fd, "account_number", 20).replace(/\s/g, "");
  if (accountNumber && !/^\d{10}$/.test(accountNumber)) return { error: "Account number should be 10 digits (NUBAN)." };
  return {
    bank_name: str(fd, "bank_name", 80) || null,
    account_number: accountNumber || null,
    account_name: str(fd, "account_name", 120) || null,
  };
}


export async function applyAffiliate(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Please sign in to apply." };

  const code = str(formData, "code", 32).toLowerCase();
  if (!REF_CODE_PATTERN.test(code)) {
    return { error: "Your code: 3–32 lowercase letters, numbers or dashes, starting with a letter or number." };
  }
  const payout = payoutFields(formData);
  if ("error" in payout) return payout;

  const [existing] = await db.select({ id: affiliates.id }).from(affiliates).where(eq(affiliates.user_id, userId));
  if (existing) return { error: "You've already applied." };

  const defaults = await affiliateSettings();
  try {
    await db.insert(affiliates).values({
    user_id: userId,
    code,
    status: "pending",
    discount_percent: defaults.defaultDiscount,
    commission_percent: defaults.defaultCommission,
    application_note: str(formData, "application_note", 1000) || null,
    ...payout,
    });
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    return { error: code === "23505" ? "That code is taken. Try another." : "Couldn't submit your application." };
  }

  const [profile] = await db.select({ full_name: profiles.full_name, email: profiles.email }).from(profiles).where(eq(profiles.id, userId));
  await logActivity(userId, "affiliate_applied", { code });
  await afterResponse(() =>
    notifyAdmins("affiliate_applied", "affiliate_applied", {
      applicantName: profile?.full_name || profile?.email || "Someone",
      code,
    }),
  );

  revalidatePath("/affiliate");
  return { ok: true as const };
}

export async function updatePayoutDetails(formData: FormData) {
  const userId = await getSessionUserId();
  if (!userId) return { error: "Please sign in again." };

  const payout = payoutFields(formData);
  if ("error" in payout) return payout;

  const updated = await db
    .update(affiliates)
    .set(payout)
    .where(eq(affiliates.user_id, userId))
    .returning({ id: affiliates.id })
    .catch(() => []);

  if (!updated.length) return { error: "Couldn't save your payout details." };
  revalidatePath("/affiliate");
  return { ok: true as const };
}
