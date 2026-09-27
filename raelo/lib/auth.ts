import "server-only";

import { notFound, redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import type {
  Profile,
  ProfileRole,
  TeamRole,
} from "@/lib/supabase/database.types";

/**
 * Returns the signed-in user's profile, or redirects to login (preserving
 * `nextPath`). Use at the top of server components and actions.
 */
export async function requireProfile(nextPath = "/portal") {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;

  if (!userId) {
    redirect(`/auth/login?next=${encodeURIComponent(nextPath)}`);
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (!profile || !profile.is_active) {
    redirect("/auth/error?error=Your%20account%20is%20not%20active");
  }

  return { supabase, profile };
}

export const STAFF_ROLES: TeamRole[] = ["admin", "account_manager", "designer"];

export function isStaffRole(role: string | null | undefined): role is TeamRole {
  return STAFF_ROLES.includes(role as TeamRole);
}

/**
 * For /admin pages: requires an active team member, optionally with one of
 * `roles`. Clients are sent to their portal; staff without the role get a
 * 404 so admin-only pages aren't advertised.
 */
export async function requireStaff(nextPath: string, roles: TeamRole[] = STAFF_ROLES) {
  const result = await requireProfile(nextPath);

  if (!isStaffRole(result.profile.role)) redirect("/portal");
  if (!roles.includes(result.profile.role)) notFound();

  return result;
}

/**
 * For server actions: the signed-in, active profile if it has one of
 * `roles`, otherwise null. Never trust the UI to hide buttons; every
 * privileged action calls this first.
 */
export async function authorize(roles: ProfileRole[]) {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const userId = data?.claims?.sub as string | undefined;
  if (!userId) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", userId)
    .single<Profile>();

  if (!profile?.is_active || !roles.includes(profile.role)) return null;
  return { supabase, profile };
}
