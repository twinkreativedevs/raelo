import "server-only";

import { eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

/** A settings row's JSON value ({} if missing). Owner connection: server use only. */
export async function getSettingValue<T = Record<string, unknown>>(key: string): Promise<T> {
  const [row] = await db
    .select({ value: schema.settings.value })
    .from(schema.settings)
    .where(eq(schema.settings.key, key));
  return (row?.value ?? {}) as T;
}
