"use server";

import { STAFF_ROLES, authorize } from "@/lib/auth";

/**
 * Called by the /compass form right after a successful sign-in: is the
 * account an active team member? The form signs anyone else back out.
 */
export async function hasTeamAccess(): Promise<boolean> {
  return Boolean(await authorize(STAFF_ROLES));
}
