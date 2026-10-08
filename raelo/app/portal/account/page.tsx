import { and, eq } from "drizzle-orm";
import type { Metadata } from "next";
import { CalendarDays, Mail, ShieldCheck } from "lucide-react";

import { requireProfile } from "@/lib/auth";
import { db, schema } from "@/lib/db";
import { formatDate } from "@/lib/format";
import { Avatar } from "@/components/app/avatar";
import { AccountForm, Section } from "@/components/portal/account-form";
import { PageHeader } from "@/components/portal/page-header";
import { PasswordForm } from "@/components/portal/password-form";

export const metadata: Metadata = { title: "Account" };

export default async function AccountPage() {
  const { profile } = await requireProfile("/portal/account");

  // Owner connection: Better Auth's account table isn't exposed to RLS.
  // Only checks whether a password login exists for this user.
  const [credential] = await db
    .select({ id: schema.account.id })
    .from(schema.account)
    .where(and(eq(schema.account.userId, profile.id), eq(schema.account.providerId, "credential")));

  const isOrg = profile.account_type === "organization";
  const name = profile.full_name || profile.email;

  return (
    <div className="space-y-6">
      <PageHeader eyebrow="Account" title="Your account" description="Keep your details current so we can reach you and invoice the right name." />

      <section className="card flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:p-6">
        <Avatar name={name} className="h-16 w-16 text-lg" />
        <div className="min-w-0 flex-1">
          <p className="truncate text-xl font-black tracking-tight">{name}</p>
          <p className="truncate text-sm text-black/50">
            {[profile.job_title, isOrg ? profile.company_name : null].filter(Boolean).join(" · ") ||
              (isOrg ? "Organization account" : "Individual account")}
          </p>
        </div>
        <dl className="grid grid-cols-1 gap-2 text-sm text-black/60 sm:text-right">
          <div className="flex items-center gap-2 sm:justify-end">
            <Mail className="h-4 w-4 text-black/35" />
            <dd className="truncate">{profile.email}</dd>
          </div>
          <div className="flex items-center gap-2 sm:justify-end">
            <CalendarDays className="h-4 w-4 text-black/35" />
            <dd>Member since {formatDate(profile.created_at)}</dd>
          </div>
        </dl>
      </section>

      <AccountForm
        initial={{
          account_type: profile.account_type,
          full_name: profile.full_name ?? "",
          job_title: profile.job_title ?? "",
          phone: profile.phone ?? "",
          bio: profile.bio ?? "",
          city: profile.city ?? "",
          country: profile.country ?? "",
          company_name: profile.company_name ?? "",
          website: profile.website ?? "",
          industry: profile.industry ?? "",
          team_size: profile.team_size ?? "",
        }}
      />

      <Section title="Sign-in & security" description="Your login email can't be changed here. Contact us if you need to move to a new address.">
        <div className="space-y-6">
          <div className="flex items-center gap-3 rounded-xl bg-black/[0.03] p-3 text-sm">
            <ShieldCheck className="h-5 w-5 shrink-0 text-green-600" />
            <span>
              Signed in as <span className="font-bold">{profile.email}</span>
              {!credential && <span className="text-black/50"> with Google</span>}
            </span>
          </div>
          <PasswordForm email={profile.email ?? ""} hasPassword={Boolean(credential)} />
        </div>
      </Section>
    </div>
  );
}
