import { googleConfigured } from "@/lib/auth-providers";
import { AuthShell } from "@/components/auth-shell";
import { LoginForm } from "@/components/login-form";

export const metadata = { title: "Log in" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;

  return (
    <AuthShell title="Welcome back" subtitle="Log in to your Raelo account.">
      {reset && (
        <p className="mb-6 rounded-xl bg-green-50 px-3.5 py-2.5 text-sm text-green-800">
          Password saved. Log in with your new password.
        </p>
      )}
      <LoginForm next={next} googleEnabled={googleConfigured} />
    </AuthShell>
  );
}
