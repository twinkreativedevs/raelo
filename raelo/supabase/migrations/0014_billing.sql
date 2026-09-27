-- 0014_billing.sql
-- Recurring billing, the Paystack webhook log, and data-driven packages.
--
-- Recurring billing uses Paystack "charge authorization": the first
-- successful card payment returns a reusable authorization, which we store
-- in payment_methods and charge from a daily cron (app/api/cron/billing).
-- Every renewal is an ordinary `orders` row (kind = 'renewal'), so it goes
-- through the same confirmation, invoicing and (later) commission logic as
-- a first purchase. Non-card payers (bank transfer, USSD) renew manually
-- from the portal.

-- ---------------------------------------------------------------------
-- payment_methods
-- ---------------------------------------------------------------------
create table if not exists public.payment_methods (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  -- Secret-ish: chargeable with our Paystack secret key. Never sent to the
  -- browser; there is deliberately no client SELECT policy on this table.
  authorization_code text not null,
  -- Paystack's stable fingerprint for the card; dedupes re-used cards.
  signature text,
  email text not null,
  customer_code text,
  channel text,
  card_type text,
  brand text,
  bank text,
  last4 text,
  exp_month text,
  exp_year text,
  reusable boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (user_id, signature)
);

comment on table public.payment_methods is 'Reusable Paystack card authorizations for automatic renewals. Server-only; the portal reads safe columns via the service role.';

create trigger payment_methods_set_updated_at
  before update on public.payment_methods
  for each row execute function public.set_updated_at();

create index if not exists payment_methods_user_id_idx on public.payment_methods (user_id);

alter table public.payment_methods enable row level security;

create policy "payment_methods_select_admin"
  on public.payment_methods for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- subscriptions: renewal state
-- ---------------------------------------------------------------------
alter table public.subscriptions
  add column if not exists auto_renew boolean not null default true,
  add column if not exists payment_method_id uuid references public.payment_methods (id) on delete set null,
  add column if not exists renewal_failures integer not null default 0,
  add column if not exists last_renewal_attempt_at timestamptz;

create index if not exists subscriptions_expires_at_idx
  on public.subscriptions (expires_at)
  where status = 'active';

-- At most one pending renewal per subscription, so overlapping cron runs or
-- a double-clicked "Renew now" can't charge twice.
create unique index if not exists orders_one_pending_renewal_idx
  on public.orders (subscription_id)
  where kind = 'renewal' and status = 'pending';

-- ---------------------------------------------------------------------
-- paystack_events: every webhook delivery, for audit and debugging
-- ---------------------------------------------------------------------
create table if not exists public.paystack_events (
  id bigint generated always as identity primary key,
  event text not null,
  reference text,
  payload jsonb not null,
  status text not null default 'received'
    check (status in ('received', 'processed', 'ignored', 'error')),
  result text,
  created_at timestamptz not null default now(),
  processed_at timestamptz
);

comment on table public.paystack_events is 'Raw Paystack webhook deliveries (signature already verified). Written by the webhook route with the service role.';

create index if not exists paystack_events_reference_idx on public.paystack_events (reference);
create index if not exists paystack_events_created_at_idx on public.paystack_events (created_at desc);

alter table public.paystack_events enable row level security;

create policy "paystack_events_select_admin"
  on public.paystack_events for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- packages: ordering + highlight for the landing page
-- ---------------------------------------------------------------------
alter table public.packages
  add column if not exists sort_order integer not null default 0,
  add column if not exists is_popular boolean not null default false;

update public.packages set sort_order = 1 where slug = 'starter';
update public.packages set sort_order = 2, is_popular = true where slug = 'growth';
update public.packages set sort_order = 3 where slug = 'pro';
update public.packages set sort_order = 4 where slug = 'business';
