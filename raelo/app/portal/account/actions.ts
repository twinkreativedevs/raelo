"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { currentUser } from "@/lib/auth";
import { schema } from "@/lib/db";

export interface ProfileInput {
  full_name?: string;
  company_name?: string;
  phone?: string;
}

const clean = (value: unknown, max = 200) =>
  typeof value === "string" ? value.trim().slice(0, max) : "";

export async function updateProfile(input: ProfileInput) {
  const auth = await currentUser();
  if (!auth) return { error: "Your session expired. Please sign in again." };

  const fullName = clean(input.full_name);
  const phone = clean(input.phone, 30);

  if (!fullName) return { error: "Please enter your name." };
  if (!/^\+?[0-9 ()-]{7,20}$/.test(phone)) {
    return { error: "Please enter a valid phone number." };
  }

  // Only self-editable columns; the profiles trigger rejects anything else.
  try {
    await auth.asUser((tx) =>
      tx
        .update(schema.profiles)
        .set({ full_name: fullName, company_name: clean(input.company_name) || null, phone })
        .where(eq(schema.profiles.id, auth.profile.id)),
    );
  } catch {
    return { error: "Couldn't save your details. Please try again." };
  }

  revalidatePath("/portal", "layout");
  return { ok: true as const };
}
