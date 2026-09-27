"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import {
  BrandFields,
  BusinessFields,
  GoalsFields,
} from "@/components/brand/brief-fields";
import { briefFormState } from "@/lib/brand-brief-state";
import type { BrandBriefInput } from "@/lib/brand-brief";
import type { OnboardingResponse } from "@/lib/supabase/database.types";
import { updateBrandBrief } from "@/app/onboarding/actions";

export function BrandForm({ initialData }: { initialData: OnboardingResponse | null }) {
  const [form, setForm] = useState<BrandBriefInput>(briefFormState(initialData));
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const update = (patch: Partial<BrandBriefInput>) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, ...patch }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateBrandBrief(form);
    setIsSaving(false);
    setMessage(
      result.error
        ? { tone: "error", text: result.error }
        : { tone: "ok", text: "Saved. Your team will use the updated brief from now on." },
    );
  };

  return (
    <form onSubmit={save} className="space-y-6">
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-bold">Business</h2>
        <BusinessFields form={form} update={update} />
      </section>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-bold">Brand</h2>
        <BrandFields form={form} update={update} />
      </section>
      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <h2 className="mb-5 font-bold">Goals & platforms</h2>
        <GoalsFields form={form} update={update} />
      </section>

      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save brand brief"}
        </Button>
        {message && (
          <p className={message.tone === "ok" ? "text-sm text-green-700" : "text-sm text-red-600"}>
            {message.text}
          </p>
        )}
      </div>
    </form>
  );
}
