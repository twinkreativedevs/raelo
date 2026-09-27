"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { affiliateSettings, REF_CODE_PATTERN } from "@/lib/affiliates";
import { afterResponse, notifyAdmins } from "@/lib/notifications";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

// Affiliates can't write their own rows (RLS: admin only), so these actions
// authenticate the user and then write with the service role, touching only
// whitelisted columns.

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

async function currentUserId() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  return data?.claims?.sub as string | undefined;
}

export async function applyAffiliate(formData: FormData) {
  const userId = await currentUserId();
  if (!userId) return { error: "Please sign in to apply." };

  const code = str(formData, "code", 32).toLowerCase();
  if (!REF_CODE_PATTERN.test(code)) {
    return { error: "Your code: 3–32 lowercase letters, numbers or dashes, starting with a letter or number." };
  }
  const payout = payoutFields(formData);
  if ("error" in payout) return payout;

  const admin = createAdminClient();
  const { data: existing } = await admin.from("affiliates").select("id").eq("user_id", userId).maybeSingle();
  if (existing) return { error: "You've already applied." };

  const defaults = await affiliateSettings();
  const { error } = await admin.from("affiliates").insert({
    user_id: userId,
    code,
    status: "pending",
    discount_percent: defaults.defaultDiscount,
    commission_percent: defaults.defaultCommission,
    application_note: str(formData, "application_note", 1000) || null,
    ...payout,
  });

  if (error) {
    return { error: error.code === "23505" ? "That code is taken. Try another." : "Couldn't submit your application." };
  }

  const { data: profile } = await admin.from("profiles").select("full_name, email").eq("id", userId).single();
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
  const userId = await currentUserId();
  if (!userId) return { error: "Please sign in again." };

  const payout = payoutFields(formData);
  if ("error" in payout) return payout;

  const { data, error } = await createAdminClient()
    .from("affiliates")
    .update(payout)
    .eq("user_id", userId)
    .select("id")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't save your payout details." };
  revalidatePath("/affiliate");
  return { ok: true as const };
}
