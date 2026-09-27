-- 0013_affiliates.sql
-- Affiliate referral programme.
--
--   affiliates   - one per user who applies; admin approves/rejects
--   orders       - gain affiliate_id/referral_code when bought via a link
--   commissions  - one per paid referred order
--   payouts      - money actually sent to an affiliate; commissions are
--                  linked to the payout that settled them
--
-- Unlock rule: commissions only become withdrawable once an affiliate has
-- `settings.affiliate.unlock_threshold` (default 50) confirmed sales. That
-- is computed in the affiliate_balances view, not stored, so changing the
-- threshold applies immediately.
--
-- All writes go through server code (service role) or admins.

create table if not exists public.affiliates (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  code text not null unique check (code ~ '^[a-z0-9][a-z0-9-]{2,31}$'),
  status text not null default 'pending'
    check (status in ('pending', 'approved', 'rejected', 'suspended')),
  discount_percent numeric(5, 2) not null default 10
    check (discount_percent >= 0 and discount_percent <= 100),
  commission_percent numeric(5, 2) not null default 10
    check (commission_percent >= 0 and commission_percent <= 100),
  bank_name text,
  account_number text,
  account_name text,
  application_note text,
  admin_note text,
  approved_at timestamptz,
  approved_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.affiliates is 'Referral partners. `code` is the lowercase slug used in referral links (?ref=code).';

create trigger affiliates_set_updated_at
  before update on public.affiliates
  for each row execute function public.set_updated_at();

create index if not exists affiliates_status_idx on public.affiliates (status);

create table if not exists public.payouts (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete restrict,
  amount numeric(12, 2) not null check (amount > 0),
  currency text not null default 'NGN',
  method text not null default 'bank_transfer',
  reference text,
  notes text,
  paid_at timestamptz not null default now(),
  recorded_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now()
);

create index if not exists payouts_affiliate_id_idx on public.payouts (affiliate_id);

create table if not exists public.commissions (
  id uuid primary key default gen_random_uuid(),
  affiliate_id uuid not null references public.affiliates (id) on delete restrict,
  order_id uuid not null unique references public.orders (id) on delete restrict,
  base_amount numeric(12, 2) not null check (base_amount >= 0),
  rate_percent numeric(5, 2) not null,
  amount numeric(12, 2) not null check (amount >= 0),
  currency text not null default 'NGN',
  status text not null default 'earned' check (status in ('earned', 'paid', 'void')),
  payout_id uuid references public.payouts (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.commissions is 'Earned per paid referred order. Rate is snapshotted so later rate changes don''t rewrite history.';

create trigger commissions_set_updated_at
  before update on public.commissions
  for each row execute function public.set_updated_at();

create index if not exists commissions_affiliate_id_idx on public.commissions (affiliate_id);
create index if not exists commissions_status_idx on public.commissions (status);

alter table public.orders
  add column if not exists affiliate_id uuid references public.affiliates (id) on delete set null,
  add column if not exists referral_code text;

create index if not exists orders_affiliate_id_idx on public.orders (affiliate_id);

-- Per-affiliate totals. security_invoker makes the underlying tables' RLS
-- apply, so affiliates only ever see their own row.
create or replace view public.affiliate_balances
with (security_invoker = true)
as
select
  a.id as affiliate_id,
  a.user_id,
  count(c.id) filter (where c.status <> 'void') as confirmed_sales,
  coalesce(sum(c.amount) filter (where c.status <> 'void'), 0) as earned_total,
  coalesce(sum(c.amount) filter (where c.status = 'paid'), 0) as paid_total,
  coalesce(sum(c.amount) filter (where c.status = 'earned'), 0) as unpaid_total,
  count(c.id) filter (where c.status <> 'void')
    >= coalesce((public.get_setting('affiliate') ->> 'unlock_threshold')::int, 50)
    as is_unlocked
from public.affiliates a
left join public.commissions c on c.affiliate_id = a.id
group by a.id, a.user_id;

comment on view public.affiliate_balances is 'Commission totals per affiliate. is_unlocked = confirmed sales have reached settings.affiliate.unlock_threshold.';

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.affiliates enable row level security;
alter table public.commissions enable row level security;
alter table public.payouts enable row level security;

create policy "affiliates_select_own_or_admin"
  on public.affiliates for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "affiliates_write_admin"
  on public.affiliates for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "commissions_select_own_or_admin"
  on public.commissions for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.affiliates a
      where a.id = commissions.affiliate_id and a.user_id = auth.uid()
    )
  );

create policy "commissions_write_admin"
  on public.commissions for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "payouts_select_own_or_admin"
  on public.payouts for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.affiliates a
      where a.id = payouts.affiliate_id and a.user_id = auth.uid()
    )
  );

create policy "payouts_write_admin"
  on public.payouts for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
