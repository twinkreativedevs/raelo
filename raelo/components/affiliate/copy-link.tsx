"use client";

import { useState } from "react";

export function CopyLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
      <code className="flex-1 truncate rounded-lg bg-black/5 px-4 py-3 text-sm" data-testid="referral-link">{url}</code>
      <button
        type="button"
        onClick={async () => {
          try {
            await navigator.clipboard.writeText(url);
            setCopied(true);
            setTimeout(() => setCopied(false), 2000);
          } catch {}
        }}
        className="rounded-lg bg-[#ed1c24] px-4 py-3 text-sm font-bold text-white"
      >
        {copied ? "Copied!" : "Copy link"}
      </button>
    </div>
  );
}
