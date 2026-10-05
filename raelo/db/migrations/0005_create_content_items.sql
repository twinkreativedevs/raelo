-- 0005_create_content_items.sql

create table if not exists public.content_items (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  title text not null,
  description text,
  content_type text,
  platform text,
  status text not null default 'requested' check (status in ('requested', 'draft', 'review', 'approved', 'delivered')),
  asset_url text,
  caption text,
  scheduled_for timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_items is 'Individual content pieces produced for a subscription. Admins create/update; clients can view and approve/request changes on their own.';

create trigger content_items_set_updated_at
  before update on public.content_items
  for each row execute function public.set_updated_at();

create index if not exists content_items_subscription_id_idx on public.content_items (subscription_id);
create index if not exists content_items_status_idx on public.content_items (status);
create index if not exists content_items_platform_idx on public.content_items (platform);
