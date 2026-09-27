"use client";

import { useState, useTransition } from "react";

import { savePackage } from "@/app/admin/packages/actions";
import { inputClass } from "@/components/admin/ui";

export interface PackageFormValues {
  id?: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  billing_period: string;
  deliverables: string[];
  sort_order: number;
  is_popular: boolean;
  active: boolean;
}

export function PackageForm({ pkg, onSaved }: { pkg?: PackageFormValues; onSaved?: () => void }) {
  const [pending, start] = useTransition();
  const [message, setMessage] = useState<string | null>(null);

  return (
    <form
      className="grid gap-3 md:grid-cols-6"
      // onSubmit (not `action`) so React doesn't reset the fields after
      // saving; the "new package" form is cleared explicitly on success.
      onSubmit={(e) => {
        e.preventDefault();
        const form = e.currentTarget;
        const fd = new FormData(form);
        start(async () => {
          const result = await savePackage(fd);
          setMessage(result.error ?? "Saved.");
          if (!result.error) {
            if (!pkg?.id) form.reset();
            onSaved?.();
          }
        });
      }}
    >
      {pkg?.id && <input type="hidden" name="id" value={pkg.id} />}
      <label className="grid gap-1 text-xs font-semibold md:col-span-2">Name<input name="name" required defaultValue={pkg?.name} className={inputClass} /></label>
      <label className="grid gap-1 text-xs font-semibold">Slug<input name="slug" required defaultValue={pkg?.slug} className={inputClass} /></label>
      <label className="grid gap-1 text-xs font-semibold">Price (₦)<input name="price" required inputMode="decimal" defaultValue={pkg?.price} className={inputClass} /></label>
      <label className="grid gap-1 text-xs font-semibold">
        Billing
        <select name="billing_period" defaultValue={pkg?.billing_period ?? "monthly"} className={inputClass}>
          <option value="monthly">Monthly</option>
          <option value="quarterly">Quarterly</option>
          <option value="annual">Annual</option>
          <option value="one_time">One-time</option>
        </select>
      </label>
      <label className="grid gap-1 text-xs font-semibold">Order<input name="sort_order" type="number" defaultValue={pkg?.sort_order ?? 0} className={inputClass} /></label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-3">Description<input name="description" defaultValue={pkg?.description ?? ""} className={inputClass} /></label>
      <label className="grid gap-1 text-xs font-semibold md:col-span-3">
        What&apos;s included <span className="font-normal text-black/50">One per line</span>
        <textarea name="deliverables" rows={3} defaultValue={pkg?.deliverables.join("\n")} className={`${inputClass} h-auto py-2`} />
      </label>
      <div className="flex flex-wrap items-center gap-4 text-sm md:col-span-6">
        <label className="flex items-center gap-2"><input type="checkbox" name="active" defaultChecked={pkg?.active ?? true} /> On sale</label>
        <label className="flex items-center gap-2"><input type="checkbox" name="is_popular" defaultChecked={pkg?.is_popular} /> Highlight as popular</label>
        <button disabled={pending} className="h-9 rounded-lg bg-[#111827] px-4 text-sm font-semibold text-white disabled:opacity-50">
          {pending ? "Saving…" : pkg?.id ? "Save changes" : "Create package"}
        </button>
        {message && <span className={message === "Saved." ? "text-green-700" : "text-red-600"}>{message}</span>}
      </div>
    </form>
  );
}
