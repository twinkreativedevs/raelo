"use client";

import { useState } from "react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { updateProfile, type ProfileInput } from "@/app/portal/account/actions";

export function AccountForm({ initial }: { initial: ProfileInput }) {
  const [form, setForm] = useState<ProfileInput>(initial);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  const set = (key: keyof ProfileInput) => (e: React.ChangeEvent<HTMLInputElement>) => {
    setMessage(null);
    setForm((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const save = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSaving(true);
    const result = await updateProfile(form);
    setIsSaving(false);
    setMessage(result.error ? { tone: "error", text: result.error } : { tone: "ok", text: "Saved." });
  };

  return (
    <form onSubmit={save} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" autoComplete="name" value={form.full_name ?? ""} onChange={set("full_name")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="company_name">Company</Label>
        <Input id="company_name" autoComplete="organization" value={form.company_name ?? ""} onChange={set("company_name")} />
      </div>
      <div className="grid gap-2">
        <Label htmlFor="phone">Phone (for SMS updates)</Label>
        <Input id="phone" type="tel" autoComplete="tel" value={form.phone ?? ""} onChange={set("phone")} />
      </div>
      <div className="flex items-center gap-4">
        <Button type="submit" disabled={isSaving}>
          {isSaving ? "Saving…" : "Save details"}
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
