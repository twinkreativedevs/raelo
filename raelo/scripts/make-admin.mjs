// Makes an existing account an admin (or another team role).
//
//   npm run make-admin -- you@example.com            -> admin
//   npm run make-admin -- someone@example.com designer
//
// Sign up through the site first, then run this once for yourself. After
// that, invite everyone else from Admin -> Team. Reads DATABASE_URL from
// .env.local (or the environment).

import pg from "pg";

const ROLES = ["admin", "account_manager", "designer", "client"];
const [email, role = "admin"] = process.argv.slice(2);

if (!email || !ROLES.includes(role)) {
  console.error("Usage: npm run make-admin -- <email> [admin|account_manager|designer|client]");
  process.exit(1);
}
if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();
try {
  const { rows } = await client.query(
    `update public.profiles
        set role = $2, is_active = true
      where lower(email) = lower($1)
      returning id, email, role`,
    [email.trim(), role],
  );
  if (!rows.length) {
    console.error(`No account found for ${email}. Sign up on the site first, then run this again.`);
    process.exitCode = 1;
  } else {
    console.log(`${rows[0].email} is now ${rows[0].role.replace("_", " ")}. Sign out and back in, then open /admin.`);
  }
} finally {
  await client.end();
}
