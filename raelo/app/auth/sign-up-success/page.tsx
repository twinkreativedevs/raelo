import type { Metadata } from "next";

import { AuthShell } from "@/components/auth-shell";
import { CheckEmail } from "@/components/check-email";

export const metadata: Metadata = { title: "Check your inbox" };

export default function Page() {
  return (
    <AuthShell>
      <CheckEmail />
    </AuthShell>
  );
}
