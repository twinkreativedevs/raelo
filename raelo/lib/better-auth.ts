import "server-only";

import { randomBytes } from "crypto";

import { betterAuth } from "better-auth";
import { nextCookies } from "better-auth/next-js";

import { googleConfigured } from "@/lib/auth-providers";
import { pool } from "@/lib/db";
import { sendAccountEmail } from "@/lib/notifications";

// Email + password sign-in (Better Auth), stored in the same Neon database:
// tables user / session / account / verification (db/migrations/0000).
// A trigger on "user" creates the matching public.profiles row, so every
// signed-in user has a profile (role defaults to 'client').
//
// Email confirmation is required once RESEND_API_KEY is set. Without it
// (local dev, or before email is connected) accounts work straight away.

const emailConfigured = Boolean(process.env.RESEND_API_KEY);

export const auth = betterAuth({
  appName: "Raelo",
  baseURL: process.env.BETTER_AUTH_URL ?? process.env.NEXT_PUBLIC_SITE_URL,
  secret: process.env.BETTER_AUTH_SECRET,
  database: pool,
  advanced: {
    database: { generateId: "uuid" },
  },
  user: {
    additionalFields: {
      // Collected on sign-up and copied to profiles.phone by the trigger.
      phone: { type: "string", required: false, input: true },
    },
  },
  emailAndPassword: {
    enabled: true,
    minPasswordLength: 8,
    requireEmailVerification: emailConfigured,
    autoSignIn: !emailConfigured,
    revokeSessionsOnPasswordReset: true,
    resetPasswordTokenExpiresIn: 60 * 60,
    sendResetPassword: async ({ user, url }) => {
      await sendAccountEmail("reset_password", { email: user.email, name: user.name, userId: user.id }, { url });
    },
  },
  // Google accounts go through the same "user" insert, so the trigger
  // creates their profile.
  socialProviders: googleConfigured
    ? {
        google: {
          clientId: process.env.GOOGLE_CLIENT_ID as string,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
          prompt: "select_account",
        },
      }
    : undefined,
  emailVerification: {
    sendOnSignUp: emailConfigured,
    autoSignInAfterVerification: true,
    sendVerificationEmail: async ({ user, url }) => {
      await sendAccountEmail("verify_email", { email: user.email, name: user.name, userId: user.id }, { url });
    },
  },
  session: {
    expiresIn: 60 * 60 * 24 * 30,
    updateAge: 60 * 60 * 24,
    cookieCache: { enabled: true, maxAge: 5 * 60 },
  },
  rateLimit: { enabled: true, window: 60, max: 30 },
  // Lets server actions set the session cookie (must be the last plugin).
  plugins: [nextCookies()],
});

export type AuthSession = typeof auth.$Infer.Session;

/**
 * A one-time "set your password" link for `userId`, valid for `hours`.
 * Uses Better Auth's own reset-password tokens, so the existing
 * /auth/update-password page completes it (and creates the password
 * login if the user didn't have one yet, e.g. an invited team member).
 */
export async function passwordSetupLink(userId: string, hours = 24) {
  const ctx = await auth.$context;
  const token = randomBytes(18).toString("base64url");
  await ctx.internalAdapter.createVerificationValue({
    value: userId,
    identifier: `reset-password:${token}`,
    expiresAt: new Date(Date.now() + hours * 3600_000),
  });
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");
  return `${site}/auth/update-password?token=${token}`;
}

/** Creates a user without a password (they set one from the invite link). */
export async function createInvitedUser(email: string, name: string) {
  const ctx = await auth.$context;
  const user = await ctx.internalAdapter.createUser({ email, name, emailVerified: true }, { method: "admin" });
  return user.id;
}
