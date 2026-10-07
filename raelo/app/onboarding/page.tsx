import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";

import { currentUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import type { OnboardingResponse } from "@/lib/db/types";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";
import { signBrandAssetUrl } from "@/lib/brand-assets";

export default async function OnboardingPage() {
  const auth = await currentUser();
  if (!auth) redirect("/auth/login?next=/onboarding");

  const [existing] = (await auth.asUser((tx) =>
    tx.select().from(schema.onboarding_responses).where(eq(schema.onboarding_responses.user_id, auth.profile.id)),
  )) as OnboardingResponse[];

  // Already done this before: edits happen on the portal's Brand page.
  if (existing?.completed) {
    redirect("/portal/brand");
  }

  const logoUrl = await signBrandAssetUrl(existing?.logo_path);

  return (
    <main className="min-h-screen bg-white text-black">
      <div className="mx-auto max-w-2xl px-6 py-16">
        <p className="text-sm font-bold uppercase tracking-widest text-red-600">
          Let&apos;s set up your brand
        </p>
        <h1 className="mt-2 text-4xl font-bold">Tell us about your brand</h1>
        <p className="mt-3 text-black/60">
          A few details so we can create content that actually sounds like
          you. Your progress is saved after every step, so you can come back
          any time.
        </p>

        <div className="mt-10">
          <OnboardingWizard
            userId={auth.profile.id}
            initialData={existing ?? null}
            logoUrl={logoUrl}
          />
        </div>
      </div>
    </main>
  );
}
