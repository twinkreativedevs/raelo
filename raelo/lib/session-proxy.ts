import { getSessionCookie } from "better-auth/cookies";
import { NextResponse, type NextRequest } from "next/server";

import { REF_CODE_PATTERN, REF_COOKIE, REF_COOKIE_MAX_DAYS } from "./referral";

// Paths reachable without a session. Everything else redirects to login.
// - /checkout: package pages render for anyone (the page itself asks for
//   login before paying), and /checkout/verify must work even if the
//   session expired while the customer was on Paystack.
// - /api/webhooks, /api/cron: server-to-server calls never carry a session
//   (they authenticate with a signature / bearer secret instead).
// - /affiliate: programme info + apply (the page asks for login to apply).
// - /api/assistant: the public AI chat widget (rate limited in the route).
// - /api/health: uptime checks.
// - /api/auth: Better Auth's own endpoints (sign-in, verify email, …).
// - /terms, /privacy, /refunds: legal pages.
const PUBLIC_PATH_PREFIXES = [
  "/auth",
  "/api/auth",
  "/terms",
  "/privacy",
  "/refunds",
  "/checkout",
  "/affiliate",
  "/api/webhooks",
  "/api/cron",
  "/api/assistant",
  "/api/health",
];

/**
 * Remembers `?ref=<code>` from affiliate links (last click wins). Stored as
 * "<code>.<timestamp>" so checkout can apply the configurable cookie window.
 */
function withReferralCookie(request: NextRequest, response: NextResponse) {
  const ref = request.nextUrl.searchParams.get("ref")?.toLowerCase();
  if (ref && REF_CODE_PATTERN.test(ref)) {
    response.cookies.set(REF_COOKIE, `${ref}.${Date.now()}`, {
      httpOnly: true,
      sameSite: "lax",
      secure: request.nextUrl.protocol === "https:",
      path: "/",
      maxAge: REF_COOKIE_MAX_DAYS * 24 * 60 * 60,
    });
  }
  return response;
}

function isPublicPath(pathname: string) {
  if (pathname === "/") return true;
  return PUBLIC_PATH_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`),
  );
}

export async function updateSession(request: NextRequest) {
  // Optimistic check: is there a session cookie at all? Pages and actions
  // still verify the session for real (lib/auth.ts); this only saves a
  // round trip by sending obviously signed-out visitors to login.
  const hasSession = Boolean(getSessionCookie(request));

  if (!hasSession && !isPublicPath(request.nextUrl.pathname)) {
    // Signed-out visitor on a private page: send them to login and bring
    // them back here afterwards.
    const url = request.nextUrl.clone();
    url.pathname = "/auth/login";
    url.search = "";
    url.searchParams.set(
      "next",
      `${request.nextUrl.pathname}${request.nextUrl.search}`,
    );
    return withReferralCookie(request, NextResponse.redirect(url));
  }

  return withReferralCookie(request, NextResponse.next({ request }));
}
