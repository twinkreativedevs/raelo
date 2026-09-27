"use client";

import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { PLATFORM_OPTIONS, type BrandBriefInput } from "@/lib/brand-brief";

// Field groups shared by the onboarding wizard (one group per step) and the
// portal Brand page (all groups on one form).

type Update = (patch: Partial<BrandBriefInput>) => void;

export function BusinessFields({ form, update }: { form: BrandBriefInput; update: Update }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="business_name">Business or brand name *</Label>
        <Input
          id="business_name"
          value={form.business_name ?? ""}
          onChange={(e) => update({ business_name: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="industry">Industry *</Label>
        <Input
          id="industry"
          value={form.industry ?? ""}
          onChange={(e) => update({ industry: e.target.value })}
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="target_audience">Target audience *</Label>
        <Textarea
          id="target_audience"
          value={form.target_audience ?? ""}
          onChange={(e) => update({ target_audience: e.target.value })}
          placeholder="Who are you trying to reach?"
        />
      </div>
    </div>
  );
}

export function BrandFields({ form, update }: { form: BrandBriefInput; update: Update }) {
  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="brand_voice">Brand voice *</Label>
        <Textarea
          id="brand_voice"
          value={form.brand_voice ?? ""}
          onChange={(e) => update({ brand_voice: e.target.value })}
          placeholder="Playful, professional, bold, minimal..."
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="brand_colors">Brand colours</Label>
        <Input
          id="brand_colors"
          value={form.brand_colors ?? ""}
          onChange={(e) => update({ brand_colors: e.target.value })}
          placeholder="e.g. #ED1C24, black, white"
        />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="competitors">Competitors or brands you admire</Label>
        <Textarea
          id="competitors"
          value={form.competitors ?? ""}
          onChange={(e) => update({ competitors: e.target.value })}
        />
      </div>
    </div>
  );
}

export function GoalsFields({ form, update }: { form: BrandBriefInput; update: Update }) {
  const platforms = form.social_platforms ?? [];
  const handles = form.social_handles ?? {};

  const togglePlatform = (platform: string) => {
    update({
      social_platforms: platforms.includes(platform)
        ? platforms.filter((p) => p !== platform)
        : [...platforms, platform],
    });
  };

  return (
    <div className="flex flex-col gap-5">
      <div className="grid gap-2">
        <Label htmlFor="content_goals">Content goals *</Label>
        <Textarea
          id="content_goals"
          value={form.content_goals ?? ""}
          onChange={(e) => update({ content_goals: e.target.value })}
          placeholder="What should this content achieve for you?"
        />
      </div>
      <div className="grid gap-2">
        <Label>Social platforms</Label>
        <div className="grid grid-cols-2 gap-3">
          {PLATFORM_OPTIONS.map((platform) => (
            <label key={platform} className="flex items-center gap-2 text-sm">
              <Checkbox
                checked={platforms.includes(platform)}
                onCheckedChange={() => togglePlatform(platform)}
              />
              {platform}
            </label>
          ))}
        </div>
      </div>
      {platforms.length > 0 && (
        <div className="grid gap-3">
          <Label>Your handles</Label>
          {platforms.map((platform) => (
            <div key={platform} className="grid grid-cols-[110px_1fr] items-center gap-3">
              <span className="text-sm text-black/60">{platform}</span>
              <Input
                aria-label={`${platform} handle`}
                value={handles[platform] ?? ""}
                placeholder="@yourbrand"
                onChange={(e) =>
                  update({ social_handles: { ...handles, [platform]: e.target.value } })
                }
              />
            </div>
          ))}
        </div>
      )}
      <div className="grid gap-2">
        <Label htmlFor="assets_url">Link to more brand assets</Label>
        <Input
          id="assets_url"
          value={form.assets_url ?? ""}
          onChange={(e) => update({ assets_url: e.target.value })}
          placeholder="Google Drive / Dropbox folder with fonts, photos, guidelines (optional)"
        />
      </div>
    </div>
  );
}
