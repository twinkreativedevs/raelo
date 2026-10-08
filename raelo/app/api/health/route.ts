import { sql } from "drizzle-orm";
import { NextResponse } from "next/server";

import { db } from "@/lib/db";

// Uptime / go-live check. Reports only whether things are configured,
// never their values. 200 when the database is reachable, migrated, and
// the settings needed to run the site are present; 503 otherwise.
// Paystack is reported but not required, so the site can run (with
// checkout switched off) before payments are connected.

export const dynamic = "force-dynamic";

const REQUIRED = [
  "DATABASE_URL",
  "BETTER_AUTH_SECRET",
  "NEXT_PUBLIC_SITE_URL",
  "CRON_SECRET",
] as const;

const OPTIONAL = [
  "PAYSTACK_SECRET_KEY",
  "BLOB_READ_WRITE_TOKEN",
  "RESEND_API_KEY",
  "TERMII_API_KEY",
  "GROQ_API_KEY",
] as const;

// Bump when a migration adds something the app depends on.
const LATEST_MIGRATION = "0019_account_types_and_team_roles.sql";

export async function GET() {
  const env = Object.fromEntries(
    [...REQUIRED, ...OPTIONAL].map((name) => [name, Boolean(process.env[name])]),
  );

  let database = false;
  let migrations = false;
  try {
    await db.execute(sql`select 1`);
    database = true;
    const { rows } = await db.execute<{ found: boolean }>(
      sql`select exists (select 1 from public.schema_migrations where name = ${LATEST_MIGRATION}) as found`,
    );
    migrations = rows[0]?.found === true;
  } catch {
    // database stays false, or migrations haven't run (no schema_migrations)
  }

  const paystackMode = process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_live_")
    ? "live"
    : process.env.PAYSTACK_SECRET_KEY?.startsWith("sk_test_")
      ? "test"
      : "not connected";

  const ok = database && migrations && REQUIRED.every((name) => env[name]);
  return NextResponse.json(
    { ok, database, migrations, paystackMode, env },
    { status: ok ? 200 : 503, headers: { "Cache-Control": "no-store" } },
  );
}
