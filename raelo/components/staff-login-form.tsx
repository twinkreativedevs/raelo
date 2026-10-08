"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Eye, EyeOff, Loader2 } from "lucide-react";
import Link from "next/link";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";
import { hasTeamAccess } from "@/app/compass/actions";
import {
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth-shell";

/**
 * Email + password sign-in for the team (/compass). After the password is
 * accepted the server checks the role; client accounts are signed straight
 * back out. The real protection is requireStaff on every /admin page.
 */
export function StaffLoginForm({ next }: { next: string }) {
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
      if (!(await hasTeamAccess())) {
        await authClient.signOut();
        throw new Error("This account doesn't have team access.");
      }
      router.push(next);
      router.refresh();
    } catch (error: unknown) {
      setError(error instanceof Error ? error.message : "An error occurred");
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleLogin} className="space-y-4">
      <div>
        <label htmlFor="email" className={authLabelClass}>
          Email
        </label>
        <input
          id="email"
          type="email"
          autoComplete="email"
          placeholder="you@helloraelo.com"
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

      <button type="submit" className={cn(authPrimaryButtonClass, "!mt-6 bg-[#080d16] hover:bg-black")} disabled={isLoading}>
        {isLoading && <Loader2 className="h-4 w-4 animate-spin" aria-hidden />}
        {isLoading ? "Signing in…" : "Sign in to Compass"}
      </button>
    </form>
  );
}
