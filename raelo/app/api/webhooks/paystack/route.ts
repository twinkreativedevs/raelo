import { NextResponse, type NextRequest } from "next/server";

import { confirmOrderPayment } from "@/lib/payments";
import { isValidWebhookSignature } from "@/lib/paystack";
import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

// Paystack webhook. Configure in Paystack: Settings → API Keys & Webhooks →
// Webhook URL = https://<site>/api/webhooks/paystack
//
// Paystack retries deliveries that don't get a 200, and can deliver the
// same event more than once or before/after the customer returns to
// /checkout/verify. confirmOrderPayment is idempotent, so that's all safe.

export async function POST(request: NextRequest) {
  const rawBody = await request.text();

  if (
    !isValidWebhookSignature(rawBody, request.headers.get("x-paystack-signature"))
  ) {
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let payload: { event?: string; data?: { reference?: string } };
  try {
    payload = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const event = payload.event ?? "unknown";
  const reference = payload.data?.reference ?? null;

  const { paystack_events } = schema;
  const [logged] = await db
    .insert(paystack_events)
    .values({ event, reference, payload })
    .returning({ id: paystack_events.id })
    .catch((error) => {
      console.error("paystack_events insert failed", error);
      return [];
    });

  const finish = async (
    status: "processed" | "ignored" | "error",
    result: string,
  ) => {
    if (!logged) return;
    await db
      .update(paystack_events)
      .set({ status, result, processed_at: new Date().toISOString() })
      .where(eq(paystack_events.id, logged.id));
  };

  if (event !== "charge.success" || !reference) {
    await finish("ignored", "unhandled event");
    return NextResponse.json({ received: true });
  }

  const result = await confirmOrderPayment(reference);

  switch (result.status) {
    case "paid":
    case "already_paid":
    case "failed":
    case "amount_mismatch":
      await finish("processed", result.status);
      return NextResponse.json({ received: true });
    case "not_found":
      // Not a Raelo order (e.g. another integration on the same Paystack
      // account). Acknowledge so Paystack stops retrying.
      await finish("ignored", "unknown reference");
      return NextResponse.json({ received: true });
    case "unreachable":
      // Couldn't re-verify with Paystack: ask for a retry.
      await finish("error", "paystack unreachable");
      return NextResponse.json({ error: "Retry later" }, { status: 503 });
  }
}
