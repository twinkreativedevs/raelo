"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/redirect";
import { cn } from "@/lib/utils";
import {
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth-shell";
import {
  AuthDivider,
  GoogleSignInButton,
} from "@/components/google-sign-in-button";

export function LoginForm({
  className,
  next,
  googleEnabled = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  next?: string;
  googleEnabled?: boolean;
}) {
  const destination = safeNextPath(next);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      const { error } = await authClient.signIn.email({ email, password });
      if (error) {
        throw new Error(
          error.status === 403
            ? "Please confirm your email first. We've sent you a new link."
            : error.message ?? "Couldn't sign you in.",
        );
      }
      // Return to wherever login was requested from (e.g. a checkout page).
      router.push(destination);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={cn("w-full", className)} {...props}>
      {googleEnabled && (
        <>
          <GoogleSignInButton next={destination} label="Continue with Google" />
          <AuthDivider label="or log in with email" />
        </>
      )}

      <form onSubmit={handleLogin} className="space-y-4">
        <div>
          <label htmlFor="email" className={authLabelClass}>
            Email
          </label>
          <input
            id="email"
            type="email"
            autoComplete="email"
            placeholder="you@business.com"
            required
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            className={authInputClass}
          />
        </div>

        <div>
          <div className="mb-1.5 flex items-center justify-between">
            <label htmlFor="password" className="text-sm font-semibold text-[#080d16]">
              Password
            </label>
            <Link
              href="/auth/forgot-password"
              className="text-sm font-medium text-black/50 hover:text-[#ed1c24]"
            >
              Forgot password?
            </Link>
          </div>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="current-password"
              required
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className={cn(authInputClass, "pr-11")}
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              aria-label={showPassword ? "Hide password" : "Show password"}
              className="absolute inset-y-0 right-0 flex w-11 items-center justify-center rounded-r-xl text-black/40 transition hover:text-black/70"
            >
              {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
            </button>
          </div>
        </div>

        {error && (
          <p role="alert" className="rounded-xl bg-[#fde8e9] px-3.5 py-2.5 text-sm text-[#a5121a]">
            {error}
          </p>
        )}

        <button type="submit" className={cn(authPrimaryButtonClass, "!mt-6")} disabled={isLoading}>
          {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
          {isLoading ? "Logging in…" : "Log in"}
        </button>
      </form>

      <p className="mt-8 text-center text-sm text-black/60">
        New to Raelo?{" "}
        <Link
          href={`/auth/sign-up?next=${encodeURIComponent(destination)}`}
          className="font-semibold text-[#ed1c24] hover:underline"
        >
          Create an account
        </Link>
      </p>
    </div>
  );
}
