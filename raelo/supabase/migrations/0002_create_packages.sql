-- 0002_create_packages.sql

create table if not exists public.packages (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  currency text not null default 'NGN',
  billing_period text not null default 'monthly' check (billing_period in ('monthly', 'quarterly', 'annual', 'one_time')),
  deliverables jsonb not null default '[]'::jsonb,
  active boolean not null default true,
  created_at timestamptz not null default now()
);

comment on table public.packages is 'Purchasable content packages shown on the landing page and used at checkout. Price is always read server-side, never trusted from the client.';

create index if not exists packages_active_idx on public.packages (active);
