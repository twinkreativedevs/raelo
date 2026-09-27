import "server-only";

import { ilikePattern } from "@/lib/admin/search";
import type { createClient } from "@/lib/supabase/server";

type Client = Awaited<ReturnType<typeof createClient>>;

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

export const ORDER_SELECT =
  "id, order_number, status, kind, subtotal, discount_amount, amount, currency, payment_reference, payment_channel, paid_at, created_at, user_id, referral_code, profiles(full_name, email, company_name), packages(name), invoices(id, invoice_number, status)";

/** Orders query with filters applied; the caller adds range/order. */
export function ordersQuery(supabase: Client, filters: OrderFilters) {
  let query = supabase.from("orders").select(ORDER_SELECT, { count: "exact" });
  if (filters.status) query = query.eq("status", filters.status);
  if (filters.kind) query = query.eq("kind", filters.kind);
  if (filters.from) query = query.gte("created_at", `${filters.from}T00:00:00Z`);
  if (filters.to) query = query.lte("created_at", `${filters.to}T23:59:59.999Z`);
  const term = ilikePattern(filters.q);
  if (term) query = query.or(`order_number.ilike.${term},payment_reference.ilike.${term}`);
  return query;
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
