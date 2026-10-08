"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Building2, Eye, EyeOff, Loader2, User } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { safeNextPath } from "@/lib/redirect";
import type { AccountType } from "@/lib/db/types";
import { cn } from "@/lib/utils";
import {
  authInputClass,
  authLabelClass,
  authPrimaryButtonClass,
} from "@/components/auth-shell";
import { SIGNUP_KEY } from "@/components/check-email";
import {
  AuthDivider,
  GoogleSignInButton,
} from "@/components/google-sign-in-button";

const ACCOUNT_TYPES: { value: AccountType; label: string; hint: string; icon: typeof User }[] = [
  { value: "individual", label: "Individual", hint: "Personal brand", icon: User },
  { value: "organization", label: "Organization", hint: "Business or team", icon: Building2 },
];

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
  const [accountType, setAccountType] = useState<AccountType>("individual");
  const [companyName, setCompanyName] = useState("");
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
        accountType,
        companyName: accountType === "organization" ? companyName.trim() : "",
        // Where the email confirmation link lands once confirmed.
        callbackURL: destination,
      });
      if (error) throw new Error(error.message ?? "Couldn't create your account.");
      // Signed in straight away when email confirmation is off.
      if (data?.token) {
        router.push(destination);
        router.refresh();
      } else {
        // Lets the next page name the address and offer "Resend email".
        try {
          sessionStorage.setItem(SIGNUP_KEY, JSON.stringify({ email: email.trim(), next: destination }));
        } catch {
          // Private mode: the page still works, just without the address.
        }
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
        <fieldset>
          <legend className={authLabelClass}>I&apos;m signing up as</legend>
          <div className="grid grid-cols-2 gap-2 rounded-2xl bg-black/[0.04] p-1">
            {ACCOUNT_TYPES.map((option) => {
              const selected = accountType === option.value;
              const Icon = option.icon;
              return (
                <label
                  key={option.value}
                  className={cn(
                    "flex cursor-pointer items-center gap-2.5 rounded-xl px-3 py-2.5 text-sm transition",
                    selected
                      ? "bg-white font-semibold text-[#080d16] shadow-sm ring-1 ring-black/5"
                      : "text-black/55 hover:text-black/80",
                  )}
                >
                  <input
                    type="radio"
                    name="account_type"
                    value={option.value}
                    checked={selected}
                    onChange={() => setAccountType(option.value)}
                    className="sr-only"
                  />
                  <span
                    className={cn(
                      "flex h-7 w-7 shrink-0 items-center justify-center rounded-lg",
                      selected ? "bg-[#ed1c24] text-white" : "bg-black/5",
                    )}
                  >
                    <Icon className="h-4 w-4" />
                  </span>
                  <span className="leading-tight">
                    {option.label}
                    <span className="block text-xs font-normal text-black/45">{option.hint}</span>
                  </span>
                </label>
              );
            })}
          </div>
        </fieldset>

        {accountType === "organization" && (
          <div>
            <label htmlFor="company-name" className={authLabelClass}>
              Organization name
            </label>
            <input
              id="company-name"
              autoComplete="organization"
              placeholder="Bakare Foods Ltd"
              required
              value={companyName}
              onChange={(e) => setCompanyName(e.target.value)}
              className={authInputClass}
            />
          </div>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label htmlFor="full-name" className={authLabelClass}>
              {accountType === "organization" ? "Your name" : "Full name"}
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
