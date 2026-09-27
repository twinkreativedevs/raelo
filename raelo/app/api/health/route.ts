import { NextResponse } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";

// Uptime / go-live check. Reports only whether things are configured,
// never their values. 200 when the database is reachable and the required
// settings are present, 503 otherwise.

export const dynamic = "force-dynamic";

const REQUIRED = [
  "NEXT_PUBLIC_SUPABASE_URL",
  "NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY",
  "SUPABASE_SERVICE_ROLE_KEY",
  "NEXT_PUBLIC_SITE_URL",
  "PAYSTACK_SECRET_KEY",
  "CRON_SECRET",
] as const;

const OPTIONAL = ["RESEND_API_KEY", "TERMII_API_KEY", "GROQ_API_KEY"] as const;

export async function GET() {
  const env = Object.fromEntries(
    [...REQUIRED, ...OPTIONAL].map((name) => [name, Boolean(process.env[name])]),
  );

  let database = false;
  let migrations = false;
  try {
    const admin = createAdminClient();
    const { error } = await admin.from("settings").select("key").limit(1);
    database = !error;
    // notification_log arrives in the newest migration (0016).
    const { error: latest } = await admin.from("notification_log").select("id").limit(1);
    migrations = !latest;
  } catch {
    database = false;
  }

  const paystackMode = process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "missing";

  const ok = database && migrations && REQUIRED.every((name) => env[name]);
  return NextResponse.json(
    { ok, database, migrations, paystackMode, env },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
