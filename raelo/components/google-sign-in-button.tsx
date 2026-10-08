"use client";

import { useState } from "react";
import { Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";

/**
 * Signs in or signs up with Google (Better Auth). The first sign-in creates
 * the "user" row, and its trigger creates the client profile with Google's
 * name. Google returns to /api/auth/callback/google, which sets the session
 * and forwards to `next`.
 */
export function GoogleSignInButton({
  next,
  label = "Continue with Google",
}: {
  next: string;
  label?: string;
}) {
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const handleClick = async () => {
    setIsLoading(true);
    setError(null);

    const { error } = await authClient.signIn.social({
      provider: "google",
      callbackURL: next,
      errorCallbackURL: "/auth/error",
    });

    // On success the browser is already leaving for Google.
    if (error) {
      setError(error.message ?? "Couldn't connect to Google.");
      setIsLoading(false);
    }
  };

  return (
    <div>
      <button
        type="button"
        onClick={handleClick}
        disabled={isLoading}
        className="flex h-11 w-full items-center justify-center gap-3 rounded-xl border border-[#dadce0] bg-white text-[15px] font-semibold text-[#1f1f1f] shadow-sm transition hover:border-[#c6c9cc] hover:bg-[#f8f9fa] focus-visible:outline-none focus-visible:ring-4 focus-visible:ring-[#4285F4]/20 active:bg-[#f1f3f4] disabled:cursor-not-allowed disabled:opacity-70"
      >
        {isLoading ? (
          <Loader2 className="h-5 w-5 animate-spin text-black/50" aria-hidden />
        ) : (
          <GoogleIcon />
        )}
        {isLoading ? "Opening Google…" : label}
      </button>
      {error && (
        <p role="alert" className="mt-2 text-sm text-[#c4161c]">
          {error}
        </p>
      )}
    </div>
  );
}

export function AuthDivider({ label = "or" }: { label?: string }) {
  return (
    <div className="my-6 flex items-center gap-4 text-xs font-medium text-black/40">
      <span className="h-px flex-1 bg-black/10" />
      {label}
      <span className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-5 w-5 shrink-0">
      <path
        fill="#4285F4"
        d="M23.52 12.27c0-.85-.08-1.67-.22-2.45H12v4.64h6.47a5.53 5.53 0 0 1-2.4 3.63v3h3.88c2.27-2.09 3.57-5.17 3.57-8.82Z"
      />
      <path
        fill="#34A853"
        d="M12 24c3.24 0 5.96-1.07 7.95-2.91l-3.88-3c-1.08.72-2.45 1.15-4.07 1.15-3.13 0-5.78-2.11-6.73-4.95H1.26v3.1A12 12 0 0 0 12 24Z"
      />
      <path
        fill="#FBBC05"
        d="M5.27 14.29a7.2 7.2 0 0 1 0-4.58v-3.1H1.26a12 12 0 0 0 0 10.78l4.01-3.1Z"
      />
      <path
        fill="#EA4335"
        d="M12 4.75c1.76 0 3.35.61 4.6 1.8l3.44-3.44A11.97 11.97 0 0 0 12 0 12 12 0 0 0 1.26 6.61l4.01 3.1C6.22 6.86 8.87 4.75 12 4.75Z"
      />
    </svg>
  );
}
