-- 0010_orders_and_invoices.sql
-- Separates "what was charged" from "what the client is entitled to".
--
--   subscriptions - the entitlement (package, status, current period)
--   orders        - one row per payment attempt (new sign-up or renewal).
--                   Holds the exact amount charged, so a later package price
--                   change can't break verification, and so revenue,
--                   invoices and affiliate commissions have a ledger.
--   invoices      - one per paid order, with a stable human-readable number.
--
-- All writes happen in trusted server code with the service role
-- (lib/payments.ts). Clients and admins get read access through RLS.

create sequence if not exists public.order_number_seq start 1001;
create sequence if not exists public.invoice_number_seq start 1001;

-- ---------------------------------------------------------------------
-- orders
-- ---------------------------------------------------------------------
create table if not exists public.orders (
  id uuid primary key default gen_random_uuid(),
  order_number text not null unique
    default ('RAE-' || lpad(nextval('public.order_number_seq')::text, 6, '0')),
  user_id uuid not null references public.profiles (id) on delete restrict,
  subscription_id uuid not null references public.subscriptions (id) on delete restrict,
  package_id uuid not null references public.packages (id) on delete restrict,
  kind text not null default 'new' check (kind in ('new', 'renewal')),
  status text not null default 'pending'
    check (status in ('pending', 'paid', 'failed', 'abandoned', 'refunded')),
  currency text not null default 'NGN',
  subtotal numeric(12, 2) not null check (subtotal >= 0),
  discount_amount numeric(12, 2) not null default 0 check (discount_amount >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  payment_reference text not null unique,
  paystack_transaction_id text,
  payment_channel text,
  paid_at timestamptz,
  failure_reason text,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint orders_amount_matches check (amount = subtotal - discount_amount)
);

comment on table public.orders is 'One row per payment attempt. `amount` is what Paystack must confirm before the linked subscription is activated or renewed.';

create trigger orders_set_updated_at
  before update on public.orders
  for each row execute function public.set_updated_at();

create index if not exists orders_user_id_idx on public.orders (user_id);
create index if not exists orders_subscription_id_idx on public.orders (subscription_id);
create index if not exists orders_status_idx on public.orders (status);
create index if not exists orders_paid_at_idx on public.orders (paid_at desc);

comment on column public.subscriptions.payment_reference is 'DEPRECATED: payment references live on public.orders since 0010. Kept for rows created before then.';

-- ---------------------------------------------------------------------
-- invoices
-- ---------------------------------------------------------------------
create table if not exists public.invoices (
  id uuid primary key default gen_random_uuid(),
  invoice_number text not null unique
    default ('INV-' || lpad(nextval('public.invoice_number_seq')::text, 6, '0')),
  order_id uuid not null unique references public.orders (id) on delete restrict,
  user_id uuid not null references public.profiles (id) on delete restrict,
  status text not null default 'paid' check (status in ('paid', 'void')),
  currency text not null default 'NGN',
  subtotal numeric(12, 2) not null,
  discount_amount numeric(12, 2) not null default 0,
  total numeric(12, 2) not null,
  -- [{ "description": "...", "quantity": 1, "unit_amount": 45000, "amount": 45000 }]
  line_items jsonb not null default '[]'::jsonb,
  billed_to_name text,
  billed_to_email text,
  billed_to_company text,
  issued_at timestamptz not null default now(),
  created_at timestamptz not null default now()
);

comment on table public.invoices is 'Issued automatically when an order is paid. Billing details are snapshotted so later profile edits don''t rewrite history.';

create index if not exists invoices_user_id_idx on public.invoices (user_id);
create index if not exists invoices_issued_at_idx on public.invoices (issued_at desc);

-- ---------------------------------------------------------------------
-- Backfill orders/invoices for subscriptions created before this migration
-- (their payment reference lived on the subscription). Uses the package's
-- current price as the best-known amount.
-- ---------------------------------------------------------------------
insert into public.orders (
  user_id, subscription_id, package_id, kind, status, currency,
  subtotal, amount, payment_reference, paid_at, created_at
)
select
  s.user_id,
  s.id,
  s.package_id,
  'new',
  case
    when s.started_at is not null then 'paid'
    when s.status = 'pending' then 'pending'
    else 'failed'
  end,
  p.currency,
  p.price,
  p.price,
  s.payment_reference,
  s.started_at,
  s.created_at
from public.subscriptions s
join public.packages p on p.id = s.package_id
where s.payment_reference is not null
on conflict (payment_reference) do nothing;

insert into public.invoices (
  order_id, user_id, currency, subtotal, total, line_items,
  billed_to_name, billed_to_email, billed_to_company, issued_at
)
select
  o.id,
  o.user_id,
  o.currency,
  o.subtotal,
  o.amount,
  jsonb_build_array(jsonb_build_object(
    'description', p.name || ' subscription',
    'quantity', 1,
    'unit_amount', o.subtotal,
    'amount', o.subtotal
  )),
  pr.full_name,
  pr.email,
  pr.company_name,
  o.paid_at
from public.orders o
join public.packages p on p.id = o.package_id
join public.profiles pr on pr.id = o.user_id
where o.status = 'paid'
on conflict (order_id) do nothing;

-- ---------------------------------------------------------------------
-- RLS: read own or admin; writes are service-role only.
-- Team members (designers/AMs) intentionally don't see money.
-- ---------------------------------------------------------------------
alter table public.orders enable row level security;
alter table public.invoices enable row level security;

create policy "orders_select_own_or_admin"
  on public.orders for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "invoices_select_own_or_admin"
  on public.invoices for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- Admins may void an invoice or mark an order refunded from the dashboard.
create policy "orders_update_admin"
  on public.orders for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "invoices_update_admin"
  on public.invoices for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
