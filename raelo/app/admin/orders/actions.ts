"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";

/**
 * Records a refund made in the Paystack dashboard: marks the order refunded
 * voids its invoice and any unpaid commission. (It does not move money.)
 */
export async function markOrderRefunded(orderId: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const { data: order, error } = await auth.supabase
    .from("orders")
    .update({ status: "refunded" })
    .eq("id", orderId)
    .eq("status", "paid")
    .select("id, user_id, order_number")
    .maybeSingle();

  if (error || !order) return { error: "Only paid orders can be marked refunded." };

  await auth.supabase.from("invoices").update({ status: "void" }).eq("order_id", order.id);
  // A refunded sale earns no commission (unless it was already paid out).
  await auth.supabase.from("commissions").update({ status: "void" }).eq("order_id", order.id).eq("status", "earned");
  await logActivity(order.user_id, "order_refunded", {
    order_id: order.id,
    order_number: order.order_number,
    by: auth.profile.id,
  });

  revalidatePath("/admin/orders");
  return { ok: true as const };
}
