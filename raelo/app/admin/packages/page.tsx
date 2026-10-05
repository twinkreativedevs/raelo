import { asc } from "drizzle-orm";

import { requireStaff } from "@/lib/auth";
import { schema } from "@/lib/db";
import { formatMoney } from "@/lib/format";
import { PackageForm } from "@/components/admin/package-form";
import { AdminPageHeader, Panel, StatusBadge } from "@/components/admin/ui";

export const metadata = { title: "Packages" };

export default async function PackagesPage() {
  const { asUser } = await requireStaff("/admin/packages", ["admin"]);
  const p = schema.packages;
  const packages = await asUser((tx) =>
    tx
      .select({
        id: p.id, name: p.name, slug: p.slug, description: p.description, price: p.price, currency: p.currency,
        billing_period: p.billing_period, deliverables: p.deliverables, sort_order: p.sort_order, is_popular: p.is_popular, active: p.active,
      })
      .from(p)
      .orderBy(asc(p.sort_order), asc(p.price)),
  );

  return (
    <>
      <AdminPageHeader
        title="Packages"
        description="What clients can buy. Changes show on the landing page within 5 minutes. Existing subscribers renew at the current price."
      />
      {packages.map((pkg) => (
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
