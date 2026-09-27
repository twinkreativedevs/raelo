import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { signBrandAssetUrl } from "@/lib/brand-assets";
import type { OnboardingResponse } from "@/lib/supabase/database.types";
import { LogoUpload } from "@/components/brand/logo-upload";
import { BrandForm } from "@/components/portal/brand-form";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Brand brief" };

export default async function BrandPage() {
  const { supabase, profile } = await requireProfile("/portal/brand");

  const { data: brief } = await supabase
    .from("onboarding_responses")
    .select("*")
    .eq("user_id", profile.id)
    .maybeSingle<OnboardingResponse>();

  // First time through, the step-by-step wizard is friendlier.
  if (!brief?.completed) redirect("/onboarding");

  const logoUrl = await signBrandAssetUrl(supabase, brief.logo_path);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Brand" title="Your brand brief" />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-bold">Logo</h2>
        <LogoUpload userId={profile.id} initialUrl={logoUrl} />
      </section>

      <BrandForm initialData={brief} />
    </div>
  );
}
