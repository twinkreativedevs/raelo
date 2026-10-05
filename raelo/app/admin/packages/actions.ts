"use server";

import { eq } from "drizzle-orm";
import { revalidatePath } from "next/cache";

import { authorize } from "@/lib/auth";
import { schema } from "@/lib/db";
import { isUuid } from "@/lib/format";

const PERIODS = ["monthly", "quarterly", "annual", "one_time"];

/** Create (no id) or update a package. Prices are in naira. */
export async function savePackage(formData: FormData) {
  const auth = await authorize(["admin"]);
  if (!auth) return { error: "Not allowed." };

  const get = (key: string) => String(formData.get(key) ?? "").trim();
  const id = get("id");
  const name = get("name").slice(0, 60);
  const slug = get("slug").toLowerCase();
  const price = Number(get("price").replace(/,/g, ""));
  const period = get("billing_period");
  const sortOrder = Number(get("sort_order") || 0);
  const deliverables = get("deliverables")
    .split("\n")
    .map((line) => line.trim())
    .filter(Boolean)
    .slice(0, 12);

  if (!name) return { error: "Name is required." };
  if (!/^[a-z0-9][a-z0-9-]{1,39}$/.test(slug)) return { error: "Slug: lowercase letters, numbers and dashes." };
  if (!Number.isFinite(price) || price < 0) return { error: "Enter a valid price." };
  if (!PERIODS.includes(period)) return { error: "Pick a billing period." };

  const row = {
    name,
    slug,
    description: get("description").slice(0, 300) || null,
    price: Math.round(price * 100) / 100,
    billing_period: period,
    deliverables,
    sort_order: Number.isFinite(sortOrder) ? Math.round(sortOrder) : 0,
    is_popular: formData.get("is_popular") === "on",
    active: formData.get("active") === "on",
  };

  if (id && !isUuid(id)) return { error: "Couldn't save the package." };
  const { packages } = schema;
  try {
    await auth.asUser((tx) =>
      id
        ? tx.update(packages).set(row).where(eq(packages.id, id))
        : tx.insert(packages).values({ ...row, currency: "NGN" }),
    );
  } catch (error) {
    const code = (error as { cause?: { code?: string } }).cause?.code;
    return { error: code === "23505" ? "That slug is already used." : "Couldn't save the package." };
  }

  revalidatePath("/admin/packages");
  revalidatePath("/");
  return { ok: true as const };
}
