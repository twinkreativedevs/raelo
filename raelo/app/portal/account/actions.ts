"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth";
import { schema } from "@/lib/db";
import { TEAM_SIZES } from "@/lib/profile-options";

export interface ProfileInput {
  account_type?: string;
  full_name?: string;
  job_title?: string;
  phone?: string;
  bio?: string;
  city?: string;
  country?: string;
  company_name?: string;
  website?: string;
  industry?: string;
  team_size?: string;
}

const clean = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

/** "example.com" -> "https://example.com"; null if it isn't a web address. */
function normalizeWebsite(raw: string) {
  if (!raw) return { value: null };
  const withScheme = /^https?:\/\//i.test(raw) ? raw : `https://${raw}`;
  try {
    const url = new URL(withScheme);
    if (!url.hostname.includes(".")) throw new Error("no dot");
    return { value: url.toString().replace(/\/$/, "") };
  } catch {
    return { error: "That website doesn't look right." };
  }
}

export async function updateProfile(input: ProfileInput) {
  const auth = await currentUser();
  if (!auth) return { error: "Your session expired. Please sign in again." };

  const accountType = input.account_type === "organization" ? "organization" : "individual";
  const fullName = clean(input.full_name, 100);
  const phone = clean(input.phone, 30);
  const companyName = clean(input.company_name);
  const teamSize = clean(input.team_size, 20);
  const website = normalizeWebsite(clean(input.website, 200));

  if (!fullName) return { error: "Please enter your name." };
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) return { error: "Please enter a valid phone number." };
  if (accountType === "organization" && !companyName) return { error: "Please enter your organization's name." };
  if (teamSize && !TEAM_SIZES.includes(teamSize)) return { error: "Pick a team size from the list." };
  if (website.error) return { error: website.error };

  // Only self-editable columns; the profiles trigger rejects anything else.
  try {
    await auth.asUser((tx) =>
      tx
        .update(schema.profiles)
        .set({
          account_type: accountType,
          full_name: fullName,
          job_title: clean(input.job_title, 100) || null,
          phone,
          bio: clean(input.bio, 500) || null,
          city: clean(input.city, 80) || null,
          country: clean(input.country, 80) || null,
          company_name: companyName || null,
          website: website.value,
          industry: clean(input.industry, 80) || null,
          team_size: accountType === "organization" ? teamSize || null : null,
        })
        .where(eq(schema.profiles.id, auth.profile.id)),
    );
  } catch {
    return { error: "Couldn't save your details. Please try again." };
  }

  revalidatePath("/portal", "layout");
  return { ok: true as const };
}
