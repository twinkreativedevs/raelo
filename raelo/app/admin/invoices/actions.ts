"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";

export async function setInvoiceStatus(invoiceId: string, status: "paid" | "void") {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (status !== "paid" && status !== "void") return { error: "Invalid status." };

  const { invoices } = schema;
  const [data] = isUuid(invoiceId)
    ? await auth.asUser((tx) =>
        tx
          .update(invoices)
          .set({ status })
          .where(eq(invoices.id, invoiceId))
          .returning({ id: invoices.id, user_id: invoices.user_id, invoice_number: invoices.invoice_number }),
      ).catch(() => [])
    : [];

  if (!data) return { error: "Couldn't update the invoice." };
  await logActivity(data.user_id, status === "void" ? "invoice_voided" : "invoice_restored", {
    invoice_id: data.id,
    invoice_number: data.invoice_number,
    by: auth.profile.id,
  });
  revalidatePath("/admin/invoices");
  return { ok: true as const };
}
