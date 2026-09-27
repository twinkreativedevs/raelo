"use client";

import { useState, useTransition } from "react";

import { applyAffiliate, updatePayoutDetails } from "@/app/affiliate/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";

function PayoutFields({ initial }: { initial?: { bank_name?: string | null; account_number?: string | null; account_name?: string | null } }) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <div className="grid gap-2"><Label htmlFor="bank_name">Bank</Label><Input id="bank_name" name="bank_name" defaultValue={initial?.bank_name ?? ""} /></div>
      <div className="grid gap-2"><Label htmlFor="account_number">Account number</Label><Input id="account_number" name="account_number" inputMode="numeric" defaultValue={initial?.account_number ?? ""} /></div>
      <div className="grid gap-2"><Label htmlFor="account_name">Account name</Label><Input id="account_name" name="account_name" defaultValue={initial?.account_name ?? ""} /></div>
    </div>
  );
}

function useSubmit(action: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  const onSubmit = (okText: string) => (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    start(async () => {
      const result = await action(fd);
      setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: okText });
    });
  };
  return { pending, message, onSubmit };
}

export function ApplyForm({ suggestedCode }: { suggestedCode: string }) {
  const { pending, message, onSubmit } = useSubmit(applyAffiliate);
  return (
    <form onSubmit={onSubmit("Application sent!")} className="space-y-5">
      <div className="grid gap-2">
        <Label htmlFor="code">Your referral code</Label>
        <Input id="code" name="code" required defaultValue={suggestedCode} />
        <p className="text-xs text-black/50">Your link will be raelo.ng/?ref=<b>your-code</b>. Lowercase letters, numbers and dashes.</p>
      </div>
      <div className="grid gap-2">
        <Label htmlFor="application_note">How will you promote Raelo?</Label>
        <Textarea id="application_note" name="application_note" placeholder="Your audience, platforms, community…" />
      </div>
      <div>
        <p className="mb-3 text-sm font-semibold">Payout account (you can add this later)</p>
        <PayoutFields />
      </div>
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-full bg-[#ed1c24] px-6 py-3 text-sm font-bold text-white disabled:opacity-50">
          {pending ? "Sending…" : "Apply"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </form>
  );
}

export function PayoutForm({ initial }: { initial: { bank_name: string | null; account_number: string | null; account_name: string | null } }) {
  const { pending, message, onSubmit } = useSubmit(updatePayoutDetails);
  return (
    <form onSubmit={onSubmit("Saved.")} className="space-y-4">
      <PayoutFields initial={initial} />
      <div className="flex items-center gap-3">
        <button disabled={pending} className="rounded-lg bg-[#111827] px-4 py-2 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : "Save payout details"}
        </button>
        {message && <span className={`text-sm ${message.ok ? "text-green-700" : "text-red-600"}`}>{message.text}</span>}
      </div>
    </form>
  );
}
