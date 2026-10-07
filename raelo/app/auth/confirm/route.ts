import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/redirect";
import { type EmailOtpType } from "@supabase/supabase-js";
import { redirect } from "next/navigation";
import { type NextRequest } from "next/server";

// Handles both Supabase email-link styles:
// - `?token_hash=...&type=...` (custom email templates, recommended)
// - `?code=...` (default templates with the PKCE flow, and Google sign-in)
export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url);
  const token_hash = searchParams.get("token_hash");
  const type = searchParams.get("type") as EmailOtpType | null;
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  // OAuth providers (Google) return here with an error if the user cancels.
  const providerError = searchParams.get("error_description") ?? searchParams.get("error");
  if (providerError) {
    redirect(`/auth/error?error=${encodeURIComponent(providerError)}`);
  }

  const supabase = await createClient();

  if (token_hash && type) {
    const { error } = await supabase.auth.verifyOtp({ type, token_hash });
    if (!error) redirect(next);
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  if (code) {
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) redirect(next);
    redirect(`/auth/error?error=${encodeURIComponent(error.message)}`);
  }

  redirect(`/auth/error?error=${encodeURIComponent("No token hash or code")}`);
}
