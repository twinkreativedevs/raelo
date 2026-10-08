import { eq } from "drizzle-orm";
import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { requireProfile } from "@/lib/auth";
import { signBrandAssetUrl } from "@/lib/brand-assets";
import { schema } from "@/lib/db";
import type { OnboardingResponse } from "@/lib/db/types";
import { LogoUpload } from "@/components/brand/logo-upload";
import { BrandForm } from "@/components/portal/brand-form";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Brand brief" };

export default async function BrandPage() {
  const { asUser, profile } = await requireProfile("/portal/brand");

  const [brief] = (await asUser((tx) =>
    tx.select().from(schema.onboarding_responses).where(eq(schema.onboarding_responses.user_id, profile.id)),
  )) as OnboardingResponse[];

  // First time through, the step-by-step wizard is friendlier.
  if (!brief?.completed) redirect("/onboarding");

  const logoUrl = await signBrandAssetUrl(brief.logo_path);

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Brand" title="Your brand brief" />

      <section className="card p-6">
        <h2 className="mb-5 font-bold">Logo</h2>
        <LogoUpload userId={profile.id} initialUrl={logoUrl} />
      </section>

      <BrandForm initialData={brief} />
    </div>
  );
}
