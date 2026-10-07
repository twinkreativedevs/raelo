import "server-only";

import { db, schema } from "@/lib/db";

/**
 * Appends to the audit log. Clients can't write activity_events directly
 * (see migration 0008), so trusted server code logs through the owner
 * connection. Logging failures never break the calling flow.
 */
export async function logActivity(
  userId: string | null,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    await db.insert(schema.activity_events).values({ user_id: userId, event_type: eventType, metadata });
  } catch (error) {
    console.error("logActivity failed", eventType, error);
  }
}
