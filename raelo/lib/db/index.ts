import "server-only";

import { sql } from "drizzle-orm";
import { drizzle } from "drizzle-orm/node-postgres";
import { Pool } from "pg";

import * as relations from "./relations";
import * as schema from "./schema";

// Neon (or any Postgres) via DATABASE_URL. On Neon use the *pooled*
// connection string (host contains "-pooler").
//
// Two ways to query:
// * `db`: the owner connection. Bypasses Row Level Security, like the old
//   Supabase service role. Use it only after authenticating and
//   authorising the user in server code (payments, webhooks, cron, admin
//   writes that need it, notifications).
// * `withUser(userId, tx => …)`: runs inside a transaction as the
//   `raelo_app` role with `app.user_id` set, so the RLS policies in
//   db/migrations decide what that user can see and change. Prefer this
//   for anything that reads or writes on behalf of a signed-in user.

const globalForDb = globalThis as unknown as { raeloPool?: Pool };

export const pool =
  globalForDb.raeloPool ??
  new Pool({
    connectionString: process.env.DATABASE_URL,
    max: 5,
    idleTimeoutMillis: 10_000,
  });

if (process.env.NODE_ENV !== "production") globalForDb.raeloPool = pool;

export const db = drizzle(pool, { schema: { ...schema, ...relations } });

export type Db = typeof db;
export type Tx = Parameters<Parameters<Db["transaction"]>[0]>[0];

/** Runs `fn` as `userId` with RLS enforced. Everything in `fn` is one transaction. */
export async function withUser<T>(userId: string, fn: (tx: Tx) => Promise<T>): Promise<T> {
  return db.transaction(async (tx) => {
    await tx.execute(
      sql`select set_config('role', 'raelo_app', true), set_config('app.user_id', ${userId}, true)`,
    );
    return fn(tx);
  });
}

export { schema };
