"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { schema } from "@/lib/db";
import { SETTINGS_SCHEMA } from "@/lib/settings-schema";

export async function saveSettings(key: string, formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const clean = SETTINGS_SCHEMA[key];
  if (!clean) return { error: "Unknown settings section." };

  const value = clean(formData);
  if ("error" in value && typeof value.error === "string") return { error: value.error };

  const saved = await auth.asUser((tx) =>
    tx
      .update(schema.settings)
      .set({ value, updated_by: auth.profile.id })
      .where(eq(schema.settings.key, key))
      .returning({ key: schema.settings.key }),
  ).catch(() => []);
  if (!saved.length) return { error: "Couldn't save settings." };

  await logActivity(auth.profile.id, "settings_updated", { key });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
