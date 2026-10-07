"use client";

import { useState } from "react";

import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";

/**
 * Signs in or signs up with Google. Supabase creates the account on first
 * use, and the handle_new_user trigger copies Google's `full_name` into
 * public.profiles. Google returns to /auth/confirm with a `code`, which
 * finishes the session and forwards to `next`.
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

    const { error } = await createClient().auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo: `${window.location.origin}/auth/confirm?next=${encodeURIComponent(next)}`,
        queryParams: { prompt: "select_account" },
      },
    });

    // On success the browser is already leaving for Google.
    if (error) {
      setError(error.message);
      setIsLoading(false);
    }
  };

  return (
    <div className="grid gap-2">
      <Button
        type="button"
        variant="outline"
        className="w-full"
        disabled={isLoading}
        onClick={handleClick}
      >
        <GoogleIcon />
        {isLoading ? "Redirecting to Google..." : label}
      </Button>
      {error && <p className="text-sm text-red-500">{error}</p>}
    </div>
  );
}

export function AuthDivider() {
  return (
    <div className="flex items-center gap-3 text-xs uppercase tracking-widest text-black/40">
      <span className="h-px flex-1 bg-black/10" />
      or
      <span className="h-px flex-1 bg-black/10" />
    </div>
  );
}

function GoogleIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4">
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
