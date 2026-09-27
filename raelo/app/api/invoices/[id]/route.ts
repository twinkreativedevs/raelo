import { NextResponse, type NextRequest } from "next/server";

import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import type { Invoice } from "@/lib/supabase/database.types";

// Downloads an invoice as PDF. Uses the signed-in user's client, so RLS
// decides access: clients get their own invoices, admins get all.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: claims } = await supabase.auth.getClaims();
  if (!claims?.claims) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { data: invoice } = await supabase
    .from("invoices")
    .select("*, orders(order_number)")
    .eq("id", id)
    .maybeSingle();

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Access to the invoice is settled above; settings are read with the
  // service role so every invoice gets the configured footer.
  const admin = createAdminClient();
  const [{ data: brandRow }, { data: emailRow }] = await Promise.all([
    admin.from("settings").select("value").eq("key", "brand").maybeSingle(),
    admin.from("settings").select("value").eq("key", "email").maybeSingle(),
  ]);
  const brand = (brandRow?.value ?? {}) as Record<string, string>;
  const email = (emailRow?.value ?? {}) as Record<string, string>;

  const order = invoice.orders as unknown as { order_number: string } | null;

  const pdf = await renderInvoicePdf(
    { ...(invoice as Invoice), order_number: order?.order_number ?? null },
    {
      siteName: brand.site_name || "Raelo",
      tagline: brand.tagline,
      supportEmail: brand.support_email,
      footerText: email.footer_text || "Raelo by Twin Kreative Limited",
    },
  );

  return new NextResponse(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${invoice.invoice_number}.pdf"`,
      "Cache-Control": "private, no-store",
    },
  });
}
