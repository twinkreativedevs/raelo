import "server-only";

import { eq } from "drizzle-orm";
import { headers } from "next/headers";
import { notFound, redirect } from "next/navigation";
import { cache } from "react";

import { auth } from "@/lib/better-auth";
import { db, schema, withUser, type Tx } from "@/lib/db";
import type { Profile, ProfileRole, TeamRole } from "@/lib/db/types";

/** The signed-in user's id from the Better Auth session, or null. */
export const getSessionUserId = cache(async (): Promise<string | null> => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user.id ?? null;
});

/** The signed-in user's session (id, email, name), or null. */
export const getSessionUser = cache(async () => {
  const session = await auth.api.getSession({ headers: await headers() });
  return session?.user ?? null;
});

const loadProfile = cache(async (userId: string): Promise<Profile | null> => {
  const [row] = await db.select().from(schema.profiles).where(eq(schema.profiles.id, userId));
  return (row as Profile | undefined) ?? null;
});

export interface Authed {
  profile: Profile;
  /** Runs queries as this user, with Row Level Security enforced. */
  asUser: <T>(fn: (tx: Tx) => Promise<T>) => Promise<T>;
}

function authed(profile: Profile): Authed {
  return { profile, asUser: (fn) => withUser(profile.id, fn) };
}

/**
 * Returns the signed-in user's profile, or redirects to `loginPath`
 * (preserving `nextPath`). Use at the top of server components and actions.
 */
export async function requireProfile(
  nextPath = "/portal",
  loginPath = "/auth/login",
): Promise<Authed> {
  const userId = await getSessionUserId();
  if (!userId) redirect(`${loginPath}?next=${encodeURIComponent(nextPath)}`);

  const profile = await loadProfile(userId);
  if (!profile || !profile.is_active) {
    redirect("/auth/error?error=Your%20account%20is%20not%20active");
  }

  return authed(profile);
}

/** Team login page. Not linked from the public site. */
export const STAFF_LOGIN_PATH = "/compass";

export const STAFF_ROLES: TeamRole[] = ["admin", "account_manager", "designer"];

export function isStaffRole(role: string | null | undefined): role is TeamRole {
  return STAFF_ROLES.includes(role as TeamRole);
}

/**
 * For /admin pages: requires an active team member, optionally with one of
 * `roles`. Signed-out visitors go to the team login (/compass), clients to
 * their portal; staff without the role get a 404 so admin-only pages
 * aren't advertised.
 */
export async function requireStaff(nextPath: string, roles: TeamRole[] = STAFF_ROLES) {
  const result = await requireProfile(nextPath, STAFF_LOGIN_PATH);

  if (!isStaffRole(result.profile.role)) redirect("/portal");
  if (!roles.includes(result.profile.role)) notFound();

  return result as Authed & { profile: Profile & { role: TeamRole } };
}

/**
 * For server actions and route handlers: the signed-in, active profile if
 * it has one of `roles`, otherwise null. Never trust the UI to hide
 * buttons; every privileged action calls this first.
 */
export async function authorize(roles: ProfileRole[]): Promise<Authed | null> {
  const userId = await getSessionUserId();
  if (!userId) return null;

  const profile = await loadProfile(userId);
  if (!profile?.is_active || !roles.includes(profile.role)) return null;
  return authed(profile);
}

/** Any signed-in, active user (client or staff), or null. */
export async function currentUser(): Promise<Authed | null> {
  return authorize(["client", "admin", "account_manager", "designer"]);
}
