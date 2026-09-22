import { redirect } from "next/navigation";

import { createClient } from "@/lib/supabase/server";
import { OnboardingWizard } from "@/components/onboarding/onboarding-wizard";

export default async function OnboardingPage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getClaims();
  const user = data?.claims;

  if (!user) {
    redirect("/auth/login?next=/onboarding");
  }

  const { data: existing } = await supabase
    .from("onboarding_responses")
    .select("*")
    .eq("user_id", user.sub as string)
    .maybeSingle();

  // Already done this before — send them straight to their dashboard.
  if (existing?.completed) {
    redirect("/protected");
  }

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
          <OnboardingWizard initialData={existing ?? null} />
        </div>
      </div>
    </main>
  );
}
