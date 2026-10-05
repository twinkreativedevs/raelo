import "server-only";

import { and, asc, eq } from "drizzle-orm";

import { db, schema } from "@/lib/db";

export interface PublicPackage {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  price: number;
  currency: string;
  billing_period: string;
  deliverables: string[];
  is_popular: boolean;
}

/** Active packages in display order. Returns [] if they can't be loaded. */
export async function getActivePackages(): Promise<PublicPackage[]> {
  if (!process.env.DATABASE_URL) return [];

  const { packages } = schema;
  try {
    const rows = await db
      .select({
        id: packages.id,
        name: packages.name,
        slug: packages.slug,
        description: packages.description,
        price: packages.price,
        currency: packages.currency,
        billing_period: packages.billing_period,
        deliverables: packages.deliverables,
        is_popular: packages.is_popular,
      })
      .from(packages)
      .where(and(eq(packages.active, true)))
      .orderBy(asc(packages.sort_order), asc(packages.price));

    return rows.map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
      deliverables: Array.isArray(pkg.deliverables) ? (pkg.deliverables as string[]) : [],
    }));
  } catch (error) {
    console.error("getActivePackages failed", error);
    return [];
  }
}

export { formatMoney as formatPrice } from "@/lib/format";
