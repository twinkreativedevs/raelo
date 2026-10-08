"use client";

import { useState } from "react";
import { Building2, Check, Loader2, User } from "lucide-react";

import { updateProfile, type ProfileInput } from "@/app/portal/account/actions";
import { INDUSTRIES, TEAM_SIZES } from "@/lib/profile-options";
import { cn } from "@/lib/utils";

type Field = keyof ProfileInput;

/** Profile and organization details, saved together. */
export function AccountForm({ initial }: { initial: ProfileInput }) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);
  const isOrg = form.account_type === "organization";

  const set = (key: Field) => (e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement | HTMLSelectElement>) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateProfile(form);
    setIsSaving(false);
    setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "Changes saved." });
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <Section title="Account type" description="Tell us whether this account is for you or for a business. You can change it any time.">
        <div className="grid gap-3 sm:grid-cols-2">
          {(
            [
              { value: "individual", label: "Individual", hint: "A personal brand, creator or freelancer", icon: User },
              { value: "organization", label: "Organization", hint: "A business, agency, school or team", icon: Building2 },
            ] as const
          ).map((option) => {
            const selected = (form.account_type ?? "individual") === option.value;
            const Icon = option.icon;
            return (
              <label
                key={option.value}
                className={cn(
                  "relative flex cursor-pointer gap-3 rounded-2xl border p-4 transition",
                  selected
                    ? "border-[#080d16] bg-[#080d16] text-white"
                    : "border-black/10 hover:border-black/25",
                )}
              >
                <input
                  type="radio"
                  name="account_type"
                  value={option.value}
                  checked={selected}
                  onChange={set("account_type")}
                  className="sr-only"
                />
                <span
                  className={cn(
                    "flex h-10 w-10 shrink-0 items-center justify-center rounded-xl",
                    selected ? "bg-[#ed1c24]" : "bg-black/[0.05]",
                  )}
                >
                  <Icon className="h-5 w-5" />
                </span>
                <span>
                  <span className="block font-bold">{option.label}</span>
                  <span className={cn("text-sm", selected ? "text-white/60" : "text-black/50")}>{option.hint}</span>
                </span>
                {selected && (
                  <span className="absolute right-3 top-3 flex h-5 w-5 items-center justify-center rounded-full bg-[#ed1c24]">
                    <Check className="h-3 w-3" strokeWidth={3} />
                  </span>
                )}
              </label>
            );
          })}
        </div>
      </Section>

      <Section title="Personal details" description="How we address you and reach you about your content.">
        <div className="grid gap-4 sm:grid-cols-2">
          <Input id="full_name" label="Full name" autoComplete="name" value={form.full_name} onChange={set("full_name")} required />
          <Input id="job_title" label="Job title" placeholder={isOrg ? "Marketing lead" : "Founder, creator…"} value={form.job_title} onChange={set("job_title")} />
          <Input id="phone" label="Phone" type="tel" autoComplete="tel" placeholder="0803 123 4567" hint="Used for SMS updates." value={form.phone} onChange={set("phone")} required />
          <div className="grid grid-cols-2 gap-3">
            <Input id="city" label="City" autoComplete="address-level2" placeholder="Lagos" value={form.city} onChange={set("city")} />
            <Input id="country" label="Country" autoComplete="country-name" placeholder="Nigeria" value={form.country} onChange={set("country")} />
          </div>
          <div className="sm:col-span-2">
            <label htmlFor="bio" className="field-label">
              About {isOrg ? "you" : "your brand"}
            </label>
            <textarea
              id="bio"
              rows={3}
              maxLength={500}
              placeholder={isOrg ? "Your role and what you need from Raelo." : "What you do and who you create for."}
              value={form.bio ?? ""}
              onChange={set("bio")}
              className="field h-auto py-3"
            />
            <p className="mt-1 text-right text-xs text-black/40">{(form.bio ?? "").length}/500</p>
          </div>
        </div>
      </Section>

      <Section
        title={isOrg ? "Organization" : "Business details"}
        description={isOrg ? "Shown on your invoices and shared with your account manager." : "Optional: add these if you run a brand or business."}
      >
        <div className="grid gap-4 sm:grid-cols-2">
          <Input
            id="company_name"
            label={isOrg ? "Organization name" : "Brand or business name"}
            autoComplete="organization"
            value={form.company_name}
            onChange={set("company_name")}
            required={isOrg}
          />
          <Input id="website" label="Website" inputMode="url" placeholder="yourbrand.com" value={form.website} onChange={set("website")} />
          <div>
            <label htmlFor="industry" className="field-label">Industry</label>
            <select id="industry" value={form.industry ?? ""} onChange={set("industry")} className="field">
              <option value="">Choose…</option>
              {INDUSTRIES.map((industry) => (
                <option key={industry}>{industry}</option>
              ))}
              {form.industry && !INDUSTRIES.includes(form.industry) && <option>{form.industry}</option>}
            </select>
          </div>
          {isOrg && (
            <div>
              <label htmlFor="team_size" className="field-label">Team size</label>
              <select id="team_size" value={form.team_size ?? ""} onChange={set("team_size")} className="field">
                <option value="">Choose…</option>
                {TEAM_SIZES.map((size) => (
                  <option key={size}>{size}</option>
                ))}
              </select>
            </div>
          )}
        </div>
      </Section>

      <div className="sticky bottom-20 z-10 flex flex-wrap items-center justify-end gap-3 rounded-2xl border border-black/[0.06] bg-white/95 p-3 shadow-lg backdrop-blur lg:bottom-4">
        {message && (
          <p role="status" className={cn("mr-auto text-sm font-semibold", message.tone === "ok" ? "text-green-700" : "text-[#c4161c]")}>
            {message.text}
          </p>
        )}
        <button type="submit" className="btn-primary" disabled={isSaving}>
          {isSaving && <Loader2 className="h-4 w-4 animate-spin" />}
          {isSaving ? "Saving…" : "Save changes"}
        </button>
      </div>
    </form>
  );
}

export function Section({
  title,
  description,
  children,
}: {
  title: string;
  description: string;
  children: React.ReactNode;
}) {
  return (
    <section className="card grid gap-5 p-5 sm:p-6 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-8">
      <div>
        <h2 className="font-black tracking-tight">{title}</h2>
        <p className="mt-1 text-sm leading-relaxed text-black/50">{description}</p>
      </div>
      <div>{children}</div>
    </section>
  );
}

function Input({
  id,
  label,
  hint,
  value,
  ...props
}: Omit<React.InputHTMLAttributes<HTMLInputElement>, "value"> & {
  id: string;
  label: string;
  hint?: string;
  value: string | undefined;
}) {
  return (
    <div>
      <label htmlFor={id} className="field-label">
        {label}
        {props.required && <span className="text-[#ed1c24]"> *</span>}
      </label>
      <input id={id} value={value ?? ""} className="field" {...props} />
      {hint && <p className="mt-1 text-xs text-black/40">{hint}</p>}
    </div>
  );
}
