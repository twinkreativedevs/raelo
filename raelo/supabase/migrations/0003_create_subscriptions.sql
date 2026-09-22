-- 0003_create_subscriptions.sql

create table if not exists public.subscriptions (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  package_id uuid not null references public.packages (id) on delete restrict,
  status text not null default 'pending' check (status in ('pending', 'active', 'paused', 'cancelled', 'expired')),
  payment_reference text unique,
  started_at timestamptz,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.subscriptions is 'A client''s purchase of a package. Created as pending at checkout init, flipped to active only after server-side Paystack verification.';

create trigger subscriptions_set_updated_at
  before update on public.subscriptions
  for each row execute function public.set_updated_at();

create index if not exists subscriptions_user_id_idx on public.subscriptions (user_id);
create index if not exists subscriptions_package_id_idx on public.subscriptions (package_id);
create index if not exists subscriptions_status_idx on public.subscriptions (status);
