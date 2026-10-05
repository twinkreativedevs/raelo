"use client";

import { authClient } from "@/lib/auth-client";
import { Button } from "@/components/ui/button";
import { useRouter } from "next/navigation";

export function LogoutButton() {
  const router = useRouter();

  const logout = async () => {
    await authClient.signOut();
    router.push("/auth/login");
    router.refresh();
  };

  return (
    <Button variant="outline" size="sm" onClick={logout}>
      Log out
    </Button>
  );
}
