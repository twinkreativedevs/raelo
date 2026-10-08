"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton({ redirectTo = "/auth/login" }: { redirectTo?: string }) {
  const router = useRouter();

  const logout = async () => {
    await authClient.signOut();
    router.push(redirectTo);
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      Log out
    </Button>
  );
}
