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

export function SignUpForm({
  className,
  next,
  googleEnabled = false,
  ...props
}: React.ComponentPropsWithoutRef<"div"> & {
  next?: string;
  googleEnabled?: boolean;
}) {
  const destination = safeNextPath(next);
  const [fullName, setFullName] = useState("");
  const [phone, setPhone] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);
    setError(null);

    try {
      // Name and phone are copied into public.profiles by the
      // handle_new_user trigger. Never add role or other privileged fields
      // here: everything sent at sign-up is client-controlled.
      const { data, error } = await authClient.signUp.email({
        email,
        password,
        name: fullName.trim(),
        phone: phone.trim(),
        // Where the email confirmation link lands once confirmed.
        callbackURL: destination,
      });
      if (error) throw new Error(error.message ?? "Couldn't create your account.");
      // Signed in straight away when email confirmation is off.
      if (data?.token) {
        router.push(destination);
        router.refresh();
      } else {
        router.push("/auth/sign-up-success");
      }
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
          <GoogleSignInButton next={destination} label="Sign up with Google" />
          <AuthDivider label="or sign up with email" />
        </>
      )}

      <form onSubmit={handleSignUp} className="space-y-4">
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="full-name" className={authLabelClass}>
              Full name
            </label>
            <input
              id="full-name"
              autoComplete="name"
              placeholder="Ada Okafor"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className={authInputClass}
            />
          </div>
          <div>
            <label htmlFor="phone" className={authLabelClass}>
              Phone number
            </label>
            <input
              id="phone"
              type="tel"
              autoComplete="tel"
              placeholder="0803 123 4567"
              required
              value={phone}
              onChange={(e) => setPhone(e.target.value)}
              className={authInputClass}
            />
          </div>
        </div>

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
          <label htmlFor="password" className={authLabelClass}>
            Password
          </label>
          <div className="relative">
            <input
              id="password"
              type={showPassword ? "text" : "password"}
              autoComplete="new-password"
              placeholder="At least 8 characters"
              minLength={8}
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
          {isLoading ? "Creating your account…" : "Create account"}
        </button>

        <p className="text-center text-xs leading-relaxed text-black/45">
          By creating an account you agree to our{" "}
          <Link href="/terms" className="font-medium text-black/70 underline underline-offset-2 hover:text-[#ed1c24]">
            Terms
          </Link>{" "}
          and{" "}
          <Link href="/privacy" className="font-medium text-black/70 underline underline-offset-2 hover:text-[#ed1c24]">
            Privacy policy
          </Link>
          .
        </p>
      </form>

      <p className="mt-8 text-center text-sm text-black/60">
        Already have an account?{" "}
        <Link
          href={`/auth/login?next=${encodeURIComponent(destination)}`}
          className="font-semibold text-[#ed1c24] hover:underline"
        >
          Log in
        </Link>
      </p>
    </div>
  );
}
