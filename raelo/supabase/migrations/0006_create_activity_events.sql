-- 0006_create_activity_events.sql

create table if not exists public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles (id) on delete set null,
  event_type text not null,
  metadata jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

comment on table public.activity_events is 'Append-only audit log: signup, onboarding_completed, payment_completed, subscription_changed, content_status_changed, etc. No update/delete policies are granted to anyone (see 0007) to keep it append-only for authenticated users; the service role can still manage it directly.';

create index if not exists activity_events_user_id_idx on public.activity_events (user_id);
create index if not exists activity_events_event_type_idx on public.activity_events (event_type);
create index if not exists activity_events_created_at_idx on public.activity_events (created_at desc);
