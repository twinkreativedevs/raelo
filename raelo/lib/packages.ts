import { createPublicClient } from "@/lib/supabase/public";
import { hasEnvVars } from "@/lib/utils";

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
  if (!hasEnvVars) return [];

  try {
    const { data, error } = await createPublicClient()
      .from("packages")
      .select(
        "id, name, slug, description, price, currency, billing_period, deliverables, is_popular",
      )
      .eq("active", true)
      .order("sort_order", { ascending: true })
      .order("price", { ascending: true });

    if (error) throw error;

    return (data ?? []).map((pkg) => ({
      ...pkg,
      price: Number(pkg.price),
      deliverables: Array.isArray(pkg.deliverables)
        ? (pkg.deliverables as string[])
        : [],
    }));
  } catch (error) {
    console.error("getActivePackages failed", error);
    return [];
  }
}

export { formatMoney as formatPrice } from "@/lib/format";
