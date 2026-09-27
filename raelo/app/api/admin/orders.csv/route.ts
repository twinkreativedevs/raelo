import { NextResponse, type NextRequest } from "next/server";

import { authorize } from "@/lib/auth";
import { ordersQuery, parseOrderFilters, toCsv } from "@/lib/admin/orders";

// CSV of orders matching the Orders page filters (the "Revenue report" export).

export async function GET(request: NextRequest) {
  const auth = await authorize(["admin"]);
  if (!auth) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const filters = parseOrderFilters(Object.fromEntries(request.nextUrl.searchParams));
  const { data, error } = await ordersQuery(auth.supabase, filters)
    .order("created_at", { ascending: false })
    .limit(10000);

  if (error) return NextResponse.json({ error: "Export failed" }, { status: 500 });

  const rows = [
    ["Order", "Type", "Status", "Client", "Email", "Company", "Package", "Subtotal", "Discount", "Amount", "Currency", "Referral code", "Channel", "Reference", "Created", "Paid", "Invoice"],
    ...(data ?? []).map((o) => {
      const client = o.profiles as unknown as { full_name: string | null; email: string; company_name: string | null } | null;
      const pkg = o.packages as unknown as { name: string } | null;
      const invoice = (o.invoices as unknown as { invoice_number: string }[] | null)?.[0];
      return [
        o.order_number, o.kind, o.status, client?.full_name, client?.email, client?.company_name, pkg?.name,
        o.subtotal, o.discount_amount, o.amount, o.currency, o.referral_code, o.payment_channel, o.payment_reference,
        o.created_at, o.paid_at, invoice?.invoice_number,
      ];
    }),
  ];

  const stamp = new Date().toISOString().slice(0, 10);
  return new NextResponse("﻿" + toCsv(rows), {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="raelo-orders-${stamp}.csv"`,
      "Cache-Control": "private, no-store",
    },
  });
}
