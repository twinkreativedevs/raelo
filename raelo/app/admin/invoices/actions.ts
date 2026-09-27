"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";

export async function setInvoiceStatus(invoiceId: string, status: "paid" | "void") {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };
  if (status !== "paid" && status !== "void") return { error: "Invalid status." };

  const { data, error } = await auth.supabase
    .from("invoices")
    .update({ status })
    .eq("id", invoiceId)
    .select("id, user_id, invoice_number")
    .maybeSingle();

  if (error || !data) return { error: "Couldn't update the invoice." };
  await logActivity(data.user_id, status === "void" ? "invoice_voided" : "invoice_restored", {
    invoice_id: data.id,
    invoice_number: data.invoice_number,
    by: auth.profile.id,
  });
  revalidatePath("/admin/invoices");
  return { ok: true as const };
}
