import { NextResponse, type NextRequest } from "next/server";

import { sendOnboardingReminders, sendRenewalReminders } from "@/lib/reminders";
import { runBillingCycle } from "@/lib/renewals";

// Daily run (see vercel.json): recurring billing, onboarding reminders, and
// "renewal due" notices for subscriptions that won't renew automatically. Vercel Cron sends
// `Authorization: Bearer $CRON_SECRET` automatically when CRON_SECRET is set;
// any other scheduler must send the same header.

export const maxDuration = 300;

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;

  if (!secret || request.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const billing = await runBillingCycle();
    const reminders = await sendOnboardingReminders();
    const renewalNotices = await sendRenewalReminders();
    return NextResponse.json({ ok: true, ...billing, reminders, renewalNotices });
  } catch (error) {
    console.error("billing cron failed", error);
    return NextResponse.json({ ok: false }, { status: 500 });
  }
}
