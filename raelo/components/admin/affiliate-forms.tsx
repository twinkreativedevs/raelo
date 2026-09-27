"use client";

import { useState, useTransition } from "react";

import { recordPayout, updateAffiliateRates } from "@/app/admin/affiliates/actions";
import { inputClass } from "@/components/admin/ui";

function useSubmit(action: (fd: FormData) => Promise<{ error?: string; ok?: boolean }>, okText: string) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<{ ok: boolean; text: string } | null>(null);
  return {
    pending,
    message,
    onSubmit: (e: React.FormEvent<HTMLFormElement>, confirmText?: string) => {
      e.preventDefault();
      if (confirmText && !window.confirm(confirmText)) return;
      const fd = new FormData(e.currentTarget);
      start(async () => {
        const result = await action(fd);
        setMessage(result.error ? { ok: false, text: result.error } : { ok: true, text: okText });
      });
    },
  };
}

export function RatesForm({ id, discount, commission, note }: { id: string; discount: number; commission: number; note: string | null }) {
  const { pending, message, onSubmit } = useSubmit(updateAffiliateRates, "Saved.");
  return (
    <form onSubmit={(e) => onSubmit(e)} className="flex flex-wrap items-end gap-2 text-xs">
      <input type="hidden" name="id" value={id} />
      <label className="grid gap-1 font-semibold">Discount %<input name="discount_percent" type="number" min={0} max={100} step="0.5" defaultValue={discount} className={`${inputClass} w-24`} /></label>
      <label className="grid gap-1 font-semibold">Commission %<input name="commission_percent" type="number" min={0} max={100} step="0.5" defaultValue={commission} className={`${inputClass} w-24`} /></label>
      <label className="grid flex-1 gap-1 font-semibold">Admin note<input name="admin_note" defaultValue={note ?? ""} className={inputClass} /></label>
      <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-3 font-semibold text-white disabled:opacity-50">Save</button>
      {message && <span className={message.ok ? "text-green-700" : "text-red-600"}>{message.text}</span>}
    </form>
  );
}

export function PayoutRecordForm({ id, amountLabel }: { id: string; amountLabel: string }) {
  const { pending, message, onSubmit } = useSubmit(recordPayout, "Payout recorded.");
  return (
    <form onSubmit={(e) => onSubmit(e, `Record a payout of ${amountLabel}? Do the bank transfer first.`)} className="flex flex-wrap items-end gap-2 text-xs">
      <input type="hidden" name="id" value={id} />
      <label className="grid gap-1 font-semibold">Method
        <select name="method" className={inputClass} defaultValue="bank_transfer">
          <option value="bank_transfer">Bank transfer</option>
          <option value="paystack_transfer">Paystack transfer</option>
          <option value="other">Other</option>
        </select>
      </label>
      <label className="grid gap-1 font-semibold">Reference<input name="reference" className={inputClass} placeholder="Transfer ref" /></label>
      <label className="grid flex-1 gap-1 font-semibold">Notes<input name="notes" className={inputClass} /></label>
      <button disabled={pending} className="h-9 rounded-lg bg-[#ed1c24] px-3 font-semibold text-white disabled:opacity-50">
        {pending ? "Recording…" : `Record payout of ${amountLabel}`}
      </button>
      {message && <span className={message.ok ? "text-green-700" : "text-red-600"}>{message.text}</span>}
    </form>
  );
}
