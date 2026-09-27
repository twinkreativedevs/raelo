"use client";

import { useState, useTransition } from "react";

import { cn } from "@/lib/utils";

/**
 * A small button that runs a server action after a confirm() prompt and
 * shows its error inline. The action must return { error } or { ok }.
 */
export function ConfirmAction({
  label,
  confirm,
  action,
  tone = "default",
  className,
}: {
  label: string;
  confirm?: string;
  action: () => Promise<{ error?: string; ok?: boolean }>;
  tone?: "default" | "danger" | "primary";
  className?: string;
}) {
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);

  return (
    <span className="inline-flex flex-col items-start gap-1">
      <button
        type="button"
        disabled={pending}
        onClick={() => {
          if (confirm && !window.confirm(confirm)) return;
          setError(null);
          start(async () => {
            const result = await action();
            if (result.error) setError(result.error);
          });
        }}
        className={cn(
          "rounded-lg px-3 py-1.5 text-xs font-semibold disabled:opacity-50",
          tone === "danger" && "border border-red-200 text-red-700 hover:bg-red-50",
          tone === "primary" && "bg-[#ed1c24] text-white hover:bg-[#c9141b]",
          tone === "default" && "border border-black/10 hover:bg-black/5",
          className,
        )}
      >
        {pending ? "Working…" : label}
      </button>
      {error && <span className="text-xs text-red-600">{error}</span>}
    </span>
  );
}
