-- 0004_create_onboarding_responses.sql

create table if not exists public.onboarding_responses (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null unique references public.profiles (id) on delete cascade,
  business_name text,
  industry text,
  target_audience text,
  brand_voice text,
  social_platforms jsonb not null default '[]'::jsonb,
  brand_colors text,
  competitors text,
  content_goals text,
  assets_url text,
  completed boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.onboarding_responses is 'One row per client, upserted across onboarding steps. `completed` gates whether content production can begin.';

create trigger onboarding_responses_set_updated_at
  before update on public.onboarding_responses
  for each row execute function public.set_updated_at();
