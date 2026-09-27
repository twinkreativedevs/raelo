-- 0016_notifications_and_assistant.sql
-- Delivery log for email/SMS notifications, and a rate limiter for the
-- public AI assistant.

-- ---------------------------------------------------------------------
-- notification_log: one row per message we tried to send
-- ---------------------------------------------------------------------
create table if not exists public.notification_log (
  id bigint generated always as identity primary key,
  event text not null,
  channel text not null check (channel in ('email', 'sms')),
  recipient text not null,
  user_id uuid references public.profiles (id) on delete set null,
  -- Used to avoid sending the same reminder twice (e.g. "onboarding:<user>").
  dedupe_key text,
  status text not null check (status in ('sent', 'failed', 'skipped')),
  provider_id text,
  error text,
  created_at timestamptz not null default now()
);

comment on table public.notification_log is 'Every email/SMS attempt. Written by server code with the service role; readable by admins.';

create index if not exists notification_log_created_at_idx on public.notification_log (created_at desc);
create index if not exists notification_log_dedupe_idx on public.notification_log (dedupe_key, created_at desc) where dedupe_key is not null;
create index if not exists notification_log_user_id_idx on public.notification_log (user_id);

alter table public.notification_log enable row level security;

create policy "notification_log_select_admin"
  on public.notification_log for select
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- Rate limiting (fixed window) for public endpoints like the AI assistant
-- ---------------------------------------------------------------------
create table if not exists public.rate_limits (
  key text not null,
  window_start timestamptz not null,
  hits integer not null default 0,
  primary key (key, window_start)
);

alter table public.rate_limits enable row level security;
-- No policies: only the service role (which bypasses RLS) touches it.

-- Records a hit and returns true while `key` is within `max_hits` per
-- `window_seconds`. Atomic under concurrency thanks to the upsert.
create or replace function public.hit_rate_limit(limit_key text, max_hits integer, window_seconds integer)
returns boolean
language plpgsql
security definer
set search_path = public
as $$
declare
  bucket timestamptz := to_timestamp(floor(extract(epoch from now()) / window_seconds) * window_seconds);
  total integer;
begin
  insert into public.rate_limits (key, window_start, hits)
  values (limit_key, bucket, 1)
  on conflict (key, window_start) do update set hits = public.rate_limits.hits + 1
  returning hits into total;

  -- Opportunistic cleanup of old windows.
  delete from public.rate_limits where window_start < now() - interval '1 day';

  return total <= max_hits;
end;
$$;

revoke all on function public.hit_rate_limit(text, integer, integer) from public, anon, authenticated;

-- Default model for the assistant (Groq model ids change; admins can edit).
update public.settings
set value = value || jsonb_build_object('model', 'llama-3.3-70b-versatile')
where key = 'ai_assistant' and coalesce(value ->> 'model', '') = '';

-- ---------------------------------------------------------------------
-- Affiliate payouts: settle every earned commission in one transaction.
-- Locks the affiliate row so two admins can't pay the same commissions.
-- ---------------------------------------------------------------------
create or replace function public.record_affiliate_payout(
  target_affiliate uuid,
  payout_method text,
  payout_reference text,
  payout_notes text
)
returns public.payouts
language plpgsql
security definer
set search_path = public
as $$
declare
  total numeric(12, 2);
  sales integer;
  threshold integer := coalesce((public.get_setting('affiliate') ->> 'unlock_threshold')::int, 50);
  result public.payouts;
begin
  if not public.is_admin() then
    raise exception 'Only admins can record payouts.' using errcode = '42501';
  end if;

  perform 1 from public.affiliates where id = target_affiliate for update;
  if not found then
    raise exception 'Affiliate not found.';
  end if;

  select count(*) filter (where status <> 'void'), coalesce(sum(amount) filter (where status = 'earned'), 0)
  into sales, total
  from public.commissions
  where affiliate_id = target_affiliate;

  if sales < threshold then
    raise exception 'Payouts unlock at % confirmed sales (this affiliate has %).', threshold, sales;
  end if;
  if total <= 0 then
    raise exception 'Nothing to pay out.';
  end if;

  insert into public.payouts (affiliate_id, amount, method, reference, notes, recorded_by)
  values (target_affiliate, total, coalesce(nullif(payout_method, ''), 'bank_transfer'), nullif(payout_reference, ''), nullif(payout_notes, ''), auth.uid())
  returning * into result;

  update public.commissions
  set status = 'paid', payout_id = result.id
  where affiliate_id = target_affiliate and status = 'earned';

  return result;
end;
$$;

revoke all on function public.record_affiliate_payout(uuid, text, text, text) from public, anon;
grant execute on function public.record_affiliate_payout(uuid, text, text, text) to authenticated;
