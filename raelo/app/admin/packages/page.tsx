import { requireStaff } from "@/lib/auth";
import { formatMoney } from "@/lib/format";
import { PackageForm } from "@/components/admin/package-form";
import { AdminPageHeader, Panel, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Packages" };

export default async function PackagesPage() {
  const { supabase } = await requireStaff("/admin/packages", ["admin"]);
  const { data: packages } = await supabase
    .from("packages")
    .select("id, name, slug, description, price, currency, billing_period, deliverables, sort_order, is_popular, active")
    .order("sort_order")
    .order("price");

  return (
    <>
      <AdminPageHeader
        title="Packages"
        description="What clients can buy. Changes show on the landing page within 5 minutes. Existing subscribers renew at the current price."
      />
      {(packages ?? []).map((pkg) => (
        <Panel
          key={pkg.id}
          title={`${pkg.name} · ${formatMoney(pkg.price, pkg.currency)}`}
          action={<StatusBadge status={pkg.active ? "active" : "inactive"} />}
        >
          <PackageForm pkg={{ ...pkg, price: Number(pkg.price), deliverables: Array.isArray(pkg.deliverables) ? (pkg.deliverables as string[]) : [] }} />
        </Panel>
      ))}
      <Panel title="New package">
        <PackageForm />
      </Panel>
    </>
  );
}
