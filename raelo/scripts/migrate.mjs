// Applies db/migrations/*.sql in order, once each, then db/seed.sql.
//
//   npm run db:migrate              (reads DATABASE_URL from .env.local)
//
// Applied files are recorded in public.schema_migrations. Each file runs in
// its own transaction, so a failing migration leaves nothing half-applied.
// The seed is an upsert and safe to re-run.

import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const root = path.resolve(import.meta.dirname, "..");
const migrationsDir = path.join(root, "db", "migrations");

if (!process.env.DATABASE_URL) {
  console.error("DATABASE_URL is not set. Add it to .env.local (see .env.example).");
  process.exit(1);
}

const client = new pg.Client({ connectionString: process.env.DATABASE_URL });
await client.connect();

try {
  await client.query(`
    create table if not exists public.schema_migrations (
      name text primary key,
      applied_at timestamptz not null default now()
    )
  `);

  const { rows } = await client.query("select name from public.schema_migrations");
  const applied = new Set(rows.map((r) => r.name));
  const files = (await readdir(migrationsDir)).filter((f) => f.endsWith(".sql")).sort();

  let count = 0;
  for (const file of files) {
    if (applied.has(file)) continue;
    const sql = await readFile(path.join(migrationsDir, file), "utf8");
    process.stdout.write(`Applying ${file} … `);
    try {
      await client.query("begin");
      await client.query(sql);
      await client.query("insert into public.schema_migrations (name) values ($1)", [file]);
      await client.query("commit");
      console.log("done");
      count += 1;
    } catch (error) {
      await client.query("rollback");
      console.log("FAILED");
      throw error;
    }
  }
  console.log(count ? `${count} migration(s) applied.` : "Database is up to date.");

  if (!process.argv.includes("--no-seed")) {
    await client.query(await readFile(path.join(root, "db", "seed.sql"), "utf8"));
    console.log("Seed applied (packages).");
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : error);
  process.exitCode = 1;
} finally {
  await client.end();
}
