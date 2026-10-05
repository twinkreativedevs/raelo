import "server-only";

import { and, count, desc, eq, gte, ilike, lte, or, type SQL } from "drizzle-orm";

import { ilikePattern } from "@/lib/admin/search";
import { schema, type Tx } from "@/lib/db";

const { orders } = schema;

export interface OrderFilters {
  status?: string;
  kind?: string;
  from?: string;
  to?: string;
  q?: string;
}

const STATUSES = ["pending", "paid", "failed", "abandoned", "refunded"];
const KINDS = ["new", "renewal"];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Parses filters from the query string, dropping anything unexpected. */
export function parseOrderFilters(params: Record<string, string | undefined>): OrderFilters {
  return {
    status: STATUSES.includes(params.status ?? "") ? params.status : undefined,
    kind: KINDS.includes(params.kind ?? "") ? params.kind : undefined,
    from: DATE.test(params.from ?? "") ? params.from : undefined,
    to: DATE.test(params.to ?? "") ? params.to : undefined,
    q: params.q?.trim().slice(0, 50) || undefined,
  };
}

function orderWhere(filters: OrderFilters): SQL | undefined {
  const term = ilikePattern(filters.q);
  return and(
    filters.status ? eq(orders.status, filters.status) : undefined,
    filters.kind ? eq(orders.kind, filters.kind) : undefined,
    filters.from ? gte(orders.created_at, `${filters.from}T00:00:00Z`) : undefined,
    filters.to ? lte(orders.created_at, `${filters.to}T23:59:59.999Z`) : undefined,
    term ? or(ilike(orders.order_number, term), ilike(orders.payment_reference, term)) : undefined,
  );
}

/**
 * Filtered orders, newest first, with client, package and invoice.
 * Run inside `asUser` so RLS applies (admins see all orders).
 */
export async function listOrders(
  tx: Tx,
  filters: OrderFilters,
  page: { limit: number; offset: number },
) {
  const where = orderWhere(filters);
  const [rows, [total]] = await Promise.all([
    tx.query.orders.findMany({
      where,
      orderBy: [desc(orders.created_at)],
      limit: page.limit,
      offset: page.offset,
      columns: {
        id: true,
        order_number: true,
        status: true,
        kind: true,
        subtotal: true,
        discount_amount: true,
        amount: true,
        currency: true,
        payment_reference: true,
        payment_channel: true,
        paid_at: true,
        created_at: true,
        user_id: true,
        referral_code: true,
      },
      with: {
        profile: { columns: { full_name: true, email: true, company_name: true } },
        package: { columns: { name: true } },
        invoices: { columns: { id: true, invoice_number: true, status: true } },
      },
    }),
    tx.select({ n: count() }).from(orders).where(where),
  ]);
  return { rows, count: total?.n ?? 0 };
}

/** RFC 4180 CSV, with a guard against spreadsheet formula injection. */
export function toCsv(rows: (string | number | null | undefined)[][]) {
  return rows
    .map((row) =>
      row
        .map((cell) => {
          let value = cell == null ? "" : String(cell);
          if (/^[=+\-@\t\r]/.test(value) && typeof cell === "string") value = `'${value}`;
          return /[",\n\r]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value;
        })
        .join(","),
    )
    .join("\r\n");
}
