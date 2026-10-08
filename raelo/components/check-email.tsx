"use client";

import Link from "next/link";
import { useEffect, useState, useSyncExternalStore } from "react";
import { ArrowUpRight, Check, Loader2, MailOpen, RotateCw } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Set by the sign-up form so this page can name the address and resend. */
export const SIGNUP_KEY = "raelo:signup";

type Pending = { email: string; next: string };

const subscribe = () => () => {};
function readPending(): string | null {
  try {
    return sessionStorage.getItem(SIGNUP_KEY);
  } catch {
    return null;
  }
}

/** Webmail shortcut for the common providers; null for everything else. */
function inboxFor(email: string) {
  const domain = email.split("@")[1]?.toLowerCase() ?? "";
  if (domain === "gmail.com" || domain === "googlemail.com") {
    return { label: "Open Gmail", href: "https://mail.google.com/mail/u/0/#search/from%3Ahelloraelo.com" };
  }
  if (["outlook.com", "hotmail.com", "live.com", "msn.com"].includes(domain)) {
    return { label: "Open Outlook", href: "https://outlook.live.com/mail/0/" };
  }
  if (domain.startsWith("yahoo.")) return { label: "Open Yahoo Mail", href: "https://mail.yahoo.com/" };
  return null;
}

const STEPS = [
  "Open the email from Raelo",
  "Click “Confirm email”",
  "You’re signed in and taken to your portal",
];
const COOLDOWN = 60;

export function CheckEmail() {
  const raw = useSyncExternalStore(subscribe, readPending, () => null);
  let pending: Pending | null = null;
  try {
    pending = raw ? (JSON.parse(raw) as Pending) : null;
  } catch {
    pending = null;
  }

  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [wait, setWait] = useState(0);

  useEffect(() => {
    if (wait <= 0) return;
    const timer = setTimeout(() => setWait((w) => w - 1), 1000);
    return () => clearTimeout(timer);
  }, [wait]);

  const resend = async () => {
    if (!pending) return;
    setBusy(true);
    setError(null);
    const { error } = await authClient.sendVerificationEmail({
      email: pending.email,
      callbackURL: pending.next,
    });
    setBusy(false);
    if (error) {
      setError(error.message ?? "Couldn't resend the email. Try again in a minute.");
      return;
    }
    setSent(true);
    setWait(COOLDOWN);
  };

  const inbox = pending ? inboxFor(pending.email) : null;

  return (
    <div>
      {/* Envelope */}
      <div className="relative mb-8 flex h-20 w-20 items-center justify-center">
        <span aria-hidden className="absolute inset-0 animate-ping rounded-3xl bg-[#ed1c24]/20 [animation-duration:2.4s]" />
        <span className="relative flex h-20 w-20 items-center justify-center rounded-3xl bg-[#ed1c24] text-white shadow-[0_12px_30px_-10px_rgba(237,28,36,0.7)]">
          <MailOpen className="h-9 w-9" strokeWidth={1.75} />
        </span>
        <span className="absolute -right-1.5 -top-1.5 flex h-7 w-7 items-center justify-center rounded-full border-4 border-white bg-[#080d16] text-white">
          <Check className="h-3.5 w-3.5" strokeWidth={3} />
        </span>
      </div>

      <h1 className="text-3xl font-black tracking-tight text-[#080d16] sm:text-[34px]">
        Check your inbox
      </h1>
      <p className="mt-3 text-[15px] leading-relaxed text-black/60">
        Your account is created. We&apos;ve sent a confirmation link to
        {pending ? (
          <span className="mt-2 block w-fit max-w-full truncate rounded-full bg-black/[0.05] px-3 py-1 text-sm font-bold text-[#080d16]">
            {pending.email}
          </span>
        ) : (
          " your email address."
        )}
      </p>

      <ol className="mt-8 space-y-3">
        {STEPS.map((step, i) => (
          <li key={step} className="flex items-center gap-3 text-sm">
            <span
              className={cn(
                "flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-xs font-black",
                i === 0 ? "bg-[#080d16] text-white" : "bg-black/[0.05] text-black/50",
              )}
            >
              {i + 1}
            </span>
            <span className={i === 0 ? "font-semibold text-[#080d16]" : "text-black/60"}>{step}</span>
          </li>
        ))}
      </ol>

      <div className="mt-8 flex flex-col gap-3 sm:flex-row">
        {inbox && (
          <a href={inbox.href} target="_blank" rel="noopener noreferrer" className="btn-primary h-11 sm:flex-1">
            {inbox.label} <ArrowUpRight className="h-4 w-4" />
          </a>
        )}
        {pending && (
          <button
            type="button"
            onClick={resend}
            disabled={busy || wait > 0}
            className={cn(inbox ? "btn-ghost" : "btn-primary", "h-11 sm:flex-1")}
          >
            {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <RotateCw className="h-4 w-4" />}
            {wait > 0 ? `Resend in ${wait}s` : "Resend email"}
          </button>
        )}
      </div>

      {sent && !error && (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm font-semibold text-green-700">
          <Check className="h-4 w-4" /> New link sent. Use the latest email.
        </p>
      )}
      {error && (
        <p role="alert" className="mt-3 rounded-xl bg-[#fde8e9] px-3.5 py-2.5 text-sm text-[#a5121a]">
          {error}
        </p>
      )}

      <div className="mt-8 rounded-2xl border border-black/[0.06] bg-black/[0.02] p-4 text-sm leading-relaxed text-black/60">
        <p className="font-semibold text-[#080d16]">Can&apos;t find it?</p>
        <p className="mt-1">
          Check your spam, junk and promotions folders. The link works for 1 hour.{" "}
          {pending
            ? "After that, use Resend email to get a fresh one."
            : "After that, try logging in and we'll email you a fresh link."}
        </p>
      </div>

      <div className="mt-8 flex flex-col items-center gap-1 text-sm text-black/55 sm:flex-row sm:justify-center sm:gap-4">
        <p>
          Already confirmed?{" "}
          <Link href="/auth/login" className="font-semibold text-[#ed1c24] hover:underline">
            Log in
          </Link>
        </p>
        <p>
          Wrong email?{" "}
          <Link href="/auth/sign-up" className="font-semibold text-[#ed1c24] hover:underline">
            Sign up again
          </Link>
        </p>
      </div>
    </div>
  );
}
