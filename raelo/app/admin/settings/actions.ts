"use server";

import { revalidatePath } from "next/cache";

import { logActivity } from "@/lib/activity";
import { authorize } from "@/lib/auth";
import { SETTINGS_SCHEMA } from "@/lib/settings-schema";

export async function saveSettings(key: string, formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const clean = SETTINGS_SCHEMA[key];
  if (!clean) return { error: "Unknown settings section." };

  const value = clean(formData);
  if ("error" in value && typeof value.error === "string") return { error: value.error };

  const { error } = await auth.supabase
    .from("settings")
    .update({ value, updated_by: auth.profile.id })
    .eq("key", key);
  if (error) return { error: "Couldn't save settings." };

  await logActivity(auth.profile.id, "settings_updated", { key });
  revalidatePath("/admin/settings");
  revalidatePath("/", "layout");
  return { ok: true as const };
}
