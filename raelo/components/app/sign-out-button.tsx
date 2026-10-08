"use client";

import { useRouter } from "next/navigation";
import { LogOut } from "lucide-react";

import { authClient } from "@/lib/auth-client";
import { cn } from "@/lib/utils";

/** Icon button for the app shells' user area. */
export function SignOutButton({
  redirectTo = "/auth/login",
  className,
}: {
  redirectTo?: string;
  className?: string;
}) {
  const router = useRouter();

  return (
    <button
      type="button"
      aria-label="Log out"
      title="Log out"
      onClick={async () => {
        await authClient.signOut();
        router.push(redirectTo);
        router.refresh();
      }}
      className={cn(
        "flex h-9 w-9 shrink-0 items-center justify-center rounded-lg transition",
        className,
      )}
    >
      <LogOut className="h-4 w-4" />
    </button>
  );
}
