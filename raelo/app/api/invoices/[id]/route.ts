import { eq } from "drizzle-orm";
import { NextResponse, type NextRequest } from "next/server";

import { currentUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import type { Invoice } from "@/lib/db/types";
import { isUuid } from "@/lib/format";
import { renderInvoicePdf } from "@/lib/invoice-pdf";
import { getSettingValue } from "@/lib/settings";

// Downloads an invoice as PDF. Runs as the signed-in user, so RLS decides
// access: clients get their own invoices, admins get all.

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const { id } = await params;
  const auth = await currentUser();
  if (!auth) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const invoice = isUuid(id)
    ? await auth.asUser((tx) =>
        tx.query.invoices.findFirst({
          where: eq(schema.invoices.id, id),
          with: { order: { columns: { order_number: true } } },
        }),
      )
    : undefined;

  if (!invoice) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Access to the invoice is settled above; settings are read server-side
  // so every invoice gets the configured footer.
  const [brand, email] = await Promise.all([
    getSettingValue<Record<string, string>>("brand"),
    getSettingValue<Record<string, string>>("email"),
  ]);

  const pdf = await renderInvoicePdf(
    { ...(invoice as unknown as Invoice), order_number: invoice.order?.order_number ?? null },
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
