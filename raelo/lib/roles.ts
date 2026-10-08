import type { AssignmentRole, TeamRole } from "@/lib/db/types";

// One place for team roles: labels, descriptions and who can do what.
// The database enforces the same lists (migration 0019); keep them in step.

/** Every team role, in the order shown in menus. */
export const TEAM_ROLES: TeamRole[] = [
  "admin",
  "account_manager",
  "social_media_manager",
  "content_creator",
  "designer",
  "email_marketer",
];

/** Roles that can be assigned to a client's subscription. */
export const ASSIGNMENT_ROLES: AssignmentRole[] = [
  "account_manager",
  "social_media_manager",
  "content_creator",
  "designer",
  "email_marketer",
];

/** Can publish content batches to clients (enforced by trigger, 0011). */
export const PUBLISH_ROLES: TeamRole[] = ["admin", "account_manager"];

export const ROLE_LABELS: Record<TeamRole, string> = {
  admin: "Admin",
  account_manager: "Account manager",
  social_media_manager: "Social media manager",
  content_creator: "Content creator",
  designer: "Designer",
  email_marketer: "Email marketer",
};

export const ROLE_DESCRIPTIONS: Record<TeamRole, string> = {
  admin: "Full access, including money, settings and the team.",
  account_manager: "Looks after assigned clients and publishes their content.",
  social_media_manager: "Plans and prepares posts for assigned clients.",
  content_creator: "Writes captions and creates content for assigned clients.",
  designer: "Designs posts and uploads drafts for assigned clients.",
  email_marketer: "Prepares email campaigns for assigned clients.",
};

export function roleLabel(role: string | null | undefined) {
  return (role && ROLE_LABELS[role as TeamRole]) || "Client";
}

export function isAssignmentRole(role: string): role is AssignmentRole {
  return (ASSIGNMENT_ROLES as string[]).includes(role);
}
