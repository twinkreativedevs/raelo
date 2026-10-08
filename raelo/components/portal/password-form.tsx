"use client";

import { useState } from "react";
import { Eye, EyeOff, Loader2, MailCheck } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/**
 * Change password (signs out other devices). Accounts created with Google
 * have no password yet; they get a "set a password" email instead.
 */
export function PasswordForm({ email, hasPassword }: { email: string; hasPassword: boolean }) {
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [show, setShow] = useState(false);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<{ tone: "ok" | "error"; text: string } | null>(null);

  if (!hasPassword) {
    return (
      <div className="space-y-4">
        <p className="text-sm text-black/60">
          You sign in with Google, so there&apos;s no Raelo password on this account. You can add one
          to sign in with your email too.
        </p>
        <button
          type="button"
          className="btn-ghost"
          disabled={busy || message?.tone === "ok"}
          onClick={async () => {
            setBusy(true);
            const { error } = await authClient.requestPasswordReset({ email, redirectTo: "/auth/update-password" });
            setBusy(false);
            setMessage(error ? { tone: "error", text: error.message ?? "Couldn't send the email." } : { tone: "ok", text: `Check ${email} for a link to set your password.` });
          }}
        >
          {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : <MailCheck className="h-4 w-4" />}
          Email me a link to set a password
        </button>
        {message && <Message {...message} />}
      </div>
    );
  }

  return (
    <form
      className="space-y-4"
      onSubmit={async (e) => {
        e.preventDefault();
        setMessage(null);
        if (next.length < 8) {
          setMessage({ tone: "error", text: "Your new password needs at least 8 characters." });
          return;
        }
        setBusy(true);
        const { error } = await authClient.changePassword({
          currentPassword: current,
          newPassword: next,
          revokeOtherSessions: true,
        });
        setBusy(false);
        if (error) {
          setMessage({ tone: "error", text: error.status === 400 ? "Your current password is incorrect." : error.message ?? "Couldn't change your password." });
          return;
        }
        setCurrent("");
        setNext("");
        setMessage({ tone: "ok", text: "Password changed. Other devices have been signed out." });
      }}
    >
      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label htmlFor="current-password" className="field-label">Current password</label>
          <input
            id="current-password"
            type={show ? "text" : "password"}
            autoComplete="current-password"
            required
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            className="field"
          />
        </div>
        <div>
          <label htmlFor="new-password" className="field-label">New password</label>
          <div className="relative">
            <input
              id="new-password"
              type={show ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
              required
              value={next}
              onChange={(e) => setNext(e.target.value)}
              className="field pr-11"
            />
            <button
              type="button"
              onClick={() => setShow((v) => !v)}
              aria-label={show ? "Hide passwords" : "Show passwords"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-black/40 hover:text-black/70"
            >
              {show ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <button type="submit" className="btn-dark" disabled={busy}>
          {busy && <Loader2 className="h-4 w-4 animate-spin" />}
          Update password
        </button>
        {message && <Message {...message} />}
      </div>
    </form>
  );
}

function Message({ tone, text }: { tone: "ok" | "error"; text: string }) {
  return (
    <p role="status" className={cn("text-sm font-semibold", tone === "ok" ? "text-green-700" : "text-[#c4161c]")}>
      {text}
    </p>
  );
}
