import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { STAFF_ROLES, authorize } from "@/lib/auth";
import { safeNextPath } from "@/lib/redirect";
import { AuthShell } from "@/components/auth-shell";
import { StaffLoginForm } from "@/components/staff-login-form";

export const metadata: Metadata = {
  title: "Team sign in",
  robots: { index: false, follow: false },
};

export default async function CompassPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const nextPath = next?.startsWith("/admin") ? safeNextPath(next) : "/admin";

  // Already signed in as a team member: straight to the dashboard.
  if (await authorize(STAFF_ROLES)) redirect(nextPath);

  return (
    <AuthShell
      variant="team"
      title="Team sign in"
      subtitle="For the Raelo team: admins, managers, creators and marketers."
    >
      <StaffLoginForm next={nextPath} />
    </AuthShell>
  );
}
