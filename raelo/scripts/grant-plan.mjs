// Gives a client account an active plan without payment, the same as
// "Give free plan" on Admin -> Clients -> client.
//
//   npm run grant-plan -- client@example.com            -> first package, 1 month
//   npm run grant-plan -- client@example.com growth 3   -> "growth" for 3 months
//
// The plan is marked complimentary: no order or invoice, never charged,
// left out of recurring revenue. Reads DATABASE_URL from .env.local.

import pg from "pg";

const [email, slug, monthsArg = "1"] = process.argv.slice(2);
const months = Number(monthsArg);

if (!email || !Number.isInteger(months) || months < 1 || months > 24) {
  console.error("Usage: npm run grant-plan -- <client email> [package slug] [months 1-24]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows: [profile] } = await client.query(
    "select id, email, role from public.profiles where lower(email) = lower($1)",
    [email.trim()],
  );
  if (!profile) throw new Error(`No account found for ${email}. Sign up on the site first.`);
  if (profile.role !== "client") {
    throw new Error(`${profile.email} is a ${profile.role}. Plans are for client accounts: use a separate email to see the client portal.`);
  }

  const { rows: [pkg] } = slug
    ? await client.query("select id, name from public.packages where slug = $1", [slug])
    : await client.query("select id, name from public.packages where active order by sort_order, price limit 1");
  if (!pkg) throw new Error(slug ? `No package with slug "${slug}".` : "No active packages. Run npm run db:migrate to seed them.");

  const { rows: [sub] } = await client.query(
    `insert into public.subscriptions
       (user_id, package_id, status, started_at, expires_at, auto_renew, complimentary)
     values ($1, $2, 'active', now(), now() + make_interval(months => $3), false, true)
     returning id, expires_at`,
    [profile.id, pkg.id, months],
  );
  await client.query(
    "insert into public.activity_events (user_id, event_type, metadata) values ($1, 'subscription_granted', $2)",
    [profile.id, { subscription_id: sub.id, package: pkg.name, months, by: "cli" }],
  );

  console.log(`${profile.email} now has ${pkg.name} until ${new Date(sub.expires_at).toDateString()}. Their portal is ready at /portal.`);
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
