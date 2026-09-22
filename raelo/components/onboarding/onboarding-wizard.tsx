"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import type { OnboardingResponse } from "@/lib/supabase/database.types";
import {
  completeOnboarding,
  saveOnboardingProgress,
  type OnboardingStepData,
} from "@/app/onboarding/actions";

const PLATFORM_OPTIONS = [
  "Instagram",
  "TikTok",
  "Facebook",
  "X / Twitter",
  "LinkedIn",
  "YouTube",
];

const STEPS = ["Business basics", "Brand", "Goals & platforms", "Review"] as const;

function toFormState(existing: OnboardingResponse | null): OnboardingStepData {
  const platforms = Array.isArray(existing?.social_platforms)
    ? (existing?.social_platforms as string[])
    : [];

  return {
    business_name: existing?.business_name ?? "",
    industry: existing?.industry ?? "",
    target_audience: existing?.target_audience ?? "",
    brand_voice: existing?.brand_voice ?? "",
    social_platforms: platforms,
    brand_colors: existing?.brand_colors ?? "",
    competitors: existing?.competitors ?? "",
    content_goals: existing?.content_goals ?? "",
    assets_url: existing?.assets_url ?? "",
  };
}

export function OnboardingWizard({
  initialData,
}: {
  initialData: OnboardingResponse | null;
}) {
  const router = useRouter();
  const [stepIndex, setStepIndex] = useState(0);
  const [form, setForm] = useState<OnboardingStepData>(
    toFormState(initialData),
  );
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const update = (patch: Partial<OnboardingStepData>) =>
    setForm((prev) => ({ ...prev, ...patch }));

  const togglePlatform = (platform: string) => {
    const current = form.social_platforms ?? [];
    const next = current.includes(platform)
      ? current.filter((p) => p !== platform)
      : [...current, platform];
    update({ social_platforms: next });
  };

  const goNext = async () => {
    setError(null);

    if (stepIndex === 0 && (!form.business_name || !form.industry)) {
      setError("Business name and industry are required.");
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

    router.push("/protected");
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
        {stepIndex === 0 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="business_name">Business or brand name *</Label>
              <Input
                id="business_name"
                value={form.business_name}
                onChange={(e) => update({ business_name: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="industry">Industry *</Label>
              <Input
                id="industry"
                value={form.industry}
                onChange={(e) => update({ industry: e.target.value })}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="target_audience">Target audience</Label>
              <Textarea
                id="target_audience"
                value={form.target_audience}
                onChange={(e) => update({ target_audience: e.target.value })}
                placeholder="Who are you trying to reach?"
              />
            </div>
          </div>
        )}

        {stepIndex === 1 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="brand_voice">Brand voice *</Label>
              <Textarea
                id="brand_voice"
                value={form.brand_voice}
                onChange={(e) => update({ brand_voice: e.target.value })}
                placeholder="Playful, professional, bold, minimal..."
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="brand_colors">Brand colors</Label>
              <Input
                id="brand_colors"
                value={form.brand_colors}
                onChange={(e) => update({ brand_colors: e.target.value })}
                placeholder="e.g. black, white, red"
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="competitors">Competitors</Label>
              <Textarea
                id="competitors"
                value={form.competitors}
                onChange={(e) => update({ competitors: e.target.value })}
              />
            </div>
          </div>
        )}

        {stepIndex === 2 && (
          <div className="flex flex-col gap-5">
            <div className="grid gap-2">
              <Label htmlFor="content_goals">Content goals *</Label>
              <Textarea
                id="content_goals"
                value={form.content_goals}
                onChange={(e) => update({ content_goals: e.target.value })}
                placeholder="What should this content achieve for you?"
              />
            </div>
            <div className="grid gap-2">
              <Label>Social platforms</Label>
              <div className="grid grid-cols-2 gap-3">
                {PLATFORM_OPTIONS.map((platform) => (
                  <label
                    key={platform}
                    className="flex items-center gap-2 text-sm"
                  >
                    <Checkbox
                      checked={(form.social_platforms ?? []).includes(
                        platform,
                      )}
                      onCheckedChange={() => togglePlatform(platform)}
                    />
                    {platform}
                  </label>
                ))}
              </div>
            </div>
            <div className="grid gap-2">
              <Label htmlFor="assets_url">Brand assets / logo URL</Label>
              <Input
                id="assets_url"
                value={form.assets_url}
                onChange={(e) => update({ assets_url: e.target.value })}
                placeholder="Link to a folder with your logo, etc. (optional)"
              />
            </div>
          </div>
        )}

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
