import "server-only";

// "Continue with Google" switches on when both keys are set. Kept apart from
// lib/better-auth.ts so the login and sign-up pages can read it without
// loading the auth server.
export const googleConfigured = Boolean(
  process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET,
);
