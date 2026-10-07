"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  BrandFields,
  BusinessFields,
  GoalsFields,
} from "@/components/brand/brief-fields";
import { LogoUpload } from "@/components/brand/logo-upload";
import { briefFormState } from "@/lib/brand-brief-state";
import type { OnboardingResponse } from "@/lib/db/types";
import {
  completeOnboarding,
  saveOnboardingProgress,
  type OnboardingStepData,
} from "@/app/onboarding/actions";

const STEPS = ["Business basics", "Brand", "Goals & platforms", "Review"] as const;

export function OnboardingWizard({
  userId,
  initialData,
  logoUrl,
}: {
  userId: string;
  initialData: OnboardingResponse | null;
  logoUrl: string | null;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<OnboardingStepData>(
    briefFormState(initialData),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OnboardingStepData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const goNext = async () => {
    setError(null);

    if (
      stepIndex === 0 &&
      (!form.business_name || !form.industry || !form.target_audience)
    ) {
      setError("Business name, industry and target audience are required.");
      return;
    }
    if (stepIndex === 1 && !form.brand_voice) {
      setError("Brand voice is required.");
      return;
    }
    if (stepIndex === 2 && !form.content_goals) {
      setError("Content goals are required.");
      return;
    }

    setIsSaving(true);
    const result = await saveOnboardingProgress(form);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    setStepIndex((i) => Math.min(i + 1, STEPS.length - 1));
  };

  const goBack = () => {
    setError(null);
    setStepIndex((i) => Math.max(i - 1, 0));
  };

  const finish = async () => {
    setError(null);
    setIsSaving(true);
    const result = await completeOnboarding(form);
    setIsSaving(false);

    if (result.error) {
      setError(result.error);
      return;
    }

    router.push("/portal");
    router.refresh();
  };

  return (
    <div>
      {/* Step indicator */}
      <div className="mb-8 flex items-center gap-2">
        {STEPS.map((label, i) => (
          <div key={label} className="flex flex-1 flex-col gap-2">
            <div
              className={`h-1.5 rounded-full ${
                i <= stepIndex ? "bg-red-600" : "bg-black/10"
              }`}
            />
            <span className="hidden text-xs font-medium text-black/50 sm:block">
              {label}
            </span>
          </div>
        ))}
      </div>

      <div className="rounded-3xl border border-black/10 p-7">
        {stepIndex === 0 && <BusinessFields form={form} update={update} />}

        {stepIndex === 1 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label>Logo</Label>
              <LogoUpload userId={userId} initialUrl={logoUrl} />
            </div>
            <BrandFields form={form} update={update} />
          </div>
        )}

        {stepIndex === 2 && <GoalsFields form={form} update={update} />}

        {stepIndex === 3 && (
          <div className="flex flex-col gap-4 text-sm">
            <h3 className="text-lg font-bold text-black">
              Review before you finish
            </h3>
            <ReviewRow label="Business" value={form.business_name} />
            <ReviewRow label="Industry" value={form.industry} />
            <ReviewRow label="Target audience" value={form.target_audience} />
            <ReviewRow label="Brand voice" value={form.brand_voice} />
            <ReviewRow label="Brand colors" value={form.brand_colors} />
            <ReviewRow
              label="Platforms"
              value={(form.social_platforms ?? []).join(", ")}
            />
            <ReviewRow label="Content goals" value={form.content_goals} />
          </div>
        )}

        {error && <p className="mt-5 text-sm text-red-600">{error}</p>}

        <div className="mt-8 flex justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={goBack}
            disabled={stepIndex === 0 || isSaving}
          >
            Back
          </Button>

          {stepIndex < STEPS.length - 1 ? (
            <Button type="button" onClick={goNext} disabled={isSaving}>
              {isSaving ? "Saving..." : "Next"}
            </Button>
          ) : (
            <Button
              type="button"
              onClick={finish}
              disabled={isSaving}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSaving ? "Finishing..." : "Finish onboarding"}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}

function ReviewRow({ label, value }: { label: string; value?: string }) {
  return (
    <div className="flex justify-between gap-4 border-b border-black/5 py-2">
      <span className="text-black/50">{label}</span>
      <span className="text-right font-medium text-black">
        {value && value.length > 0 ? value : "—"}
      </span>
    </div>
  );
}
