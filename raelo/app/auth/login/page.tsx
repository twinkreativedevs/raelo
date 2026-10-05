import { LoginForm } from "@/components/login-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ next?: string; reset?: string }>;
}) {
  const { next, reset } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm space-y-4">
        {reset && (
          <p className="rounded-lg bg-green-50 px-4 py-3 text-sm text-green-800">
            Password saved. Sign in with your new password.
          </p>
        )}
        <LoginForm next={next} />
      </div>
    </div>
  );
}
