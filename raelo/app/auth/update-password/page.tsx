import Link from "next/link";

import { UpdatePasswordForm } from "@/components/update-password-form";

export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ token?: string; error?: string }>;
}) {
  const { token, error } = await searchParams;

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        {error || !token ? (
          <div className="space-y-3 rounded-xl border p-6 text-sm">
            <p className="font-semibold">This link has expired or isn&apos;t valid.</p>
            <Link href="/auth/forgot-password" className="text-[#ed1c24] underline underline-offset-4">
              Send me a new link
            </Link>
          </div>
        ) : (
          <UpdatePasswordForm token={token} />
        )}
      </div>
    </div>
  );
}
