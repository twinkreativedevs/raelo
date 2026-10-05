"use server";

import { and, eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";

/**
 * Records a refund made in the Paystack dashboard: marks the order refunded
 * voids its invoice and any unpaid commission. (It does not move money.)
 */
export async function markOrderRefunded(orderId: string) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  if (!isUuid(orderId)) return { error: "Only paid orders can be marked refunded." };
  const { orders, invoices, commissions } = schema;

  const order = await auth.asUser(async (tx) => {
    const [row] = await tx
      .update(orders)
      .set({ status: "refunded" })
      .where(and(eq(orders.id, orderId), eq(orders.status, "paid")))
      .returning({ id: orders.id, user_id: orders.user_id, order_number: orders.order_number });
    if (!row) return null;
    await tx.update(invoices).set({ status: "void" }).where(eq(invoices.order_id, row.id));
    // A refunded sale earns no commission (unless it was already paid out).
    await tx
      .update(commissions)
      .set({ status: "void" })
      .where(and(eq(commissions.order_id, row.id), eq(commissions.status, "earned")));
    return row;
  }).catch(() => null);

  if (!order) return { error: "Only paid orders can be marked refunded." };
  await logActivity(order.user_id, "order_refunded", {
    order_id: order.id,
    order_number: order.order_number,
    by: auth.profile.id,
  });

  revalidatePath("/admin/orders");
  return { ok: true as const };
}
