import type { Metadata } from "next";
import Link from "next/link";

import { requireProfile } from "@/lib/auth";
import { AccountForm } from "@/components/portal/account-form";
import { PageHeader } from "@/components/portal/page-header";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { profile } = await requireProfile("/portal/account");

  return (
    <div className="space-y-8">
      <PageHeader eyebrow="Account" title="Your details" />

      <section className="rounded-2xl bg-white p-6 shadow-sm">
        <AccountForm
          initial={{
            full_name: profile.full_name ?? "",
            company_name: profile.company_name ?? "",
            phone: profile.phone ?? "",
          }}
        />
      </section>

      <section className="rounded-2xl bg-white p-6 shadow-sm text-sm">
        <h2 className="font-bold">Sign-in</h2>
        <p className="mt-2 text-black/60">
          Signed in as <span className="font-semibold text-black">{profile.email}</span>.
        </p>
        <Link
          href="/auth/update-password"
          className="mt-4 inline-block font-semibold text-[#ed1c24] underline underline-offset-4"
        >
          Change password
        </Link>
      </section>
    </div>
  );
}
