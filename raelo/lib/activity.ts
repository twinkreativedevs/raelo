import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Appends to the audit log. Clients can't write activity_events directly
 * (see migration 0008), so trusted server code logs through the service
 * role. Logging failures never break the calling flow.
 */
export async function logActivity(
  userId: string | null,
  eventType: string,
  metadata: Record<string, unknown> = {},
) {
  try {
    const admin = createAdminClient();
    const { error } = await admin
      .from("activity_events")
      .insert({ user_id: userId, event_type: eventType, metadata });
    if (error) console.error("logActivity failed", eventType, error.message);
  } catch (error) {
    console.error("logActivity failed", eventType, error);
  }
}
