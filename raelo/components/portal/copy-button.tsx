"use client";

import { useState } from "react";

export function CopyButton({ text, label = "Copy caption" }: { text: string; label?: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Clipboard can be unavailable (e.g. insecure context); ignore.
    }
  };

  return (
    <button
      type="button"
      onClick={copy}
      className="text-xs font-semibold text-[#ed1c24] underline underline-offset-4"
    >
      {copied ? "Copied!" : label}
    </button>
  );
}
