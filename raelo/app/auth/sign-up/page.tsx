import { googleConfigured } from "@/lib/auth-providers";
import { AuthShell } from "@/components/auth-shell";
import { SignUpForm } from "@/components/sign-up-form";

export const metadata = { title: "Create your account" };

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <AuthShell
      title="Create your account"
      subtitle="Get your brand's content done for you. It takes a minute."
    >
      <SignUpForm next={next} googleEnabled={googleConfigured} />
    </AuthShell>
  );
}
