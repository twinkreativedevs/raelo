-- 0012_settings.sql
-- Key/value app settings edited from the admin Settings screen.
--
-- API secrets (Paystack, Termii, Groq, email provider) are NOT stored here:
-- they live in server environment variables so a database leak or an admin
-- screen bug can't expose them. See .env.example.

create table if not exists public.settings (
  key text primary key,
  value jsonb not null default '{}'::jsonb,
  -- Public rows (e.g. brand) are readable by signed-out visitors.
  is_public boolean not null default false,
  description text,
  updated_at timestamptz not null default now(),
  updated_by uuid references public.profiles (id) on delete set null
);

comment on table public.settings is 'App configuration, one JSON document per key. Never store secrets here.';

create trigger settings_set_updated_at
  before update on public.settings
  for each row execute function public.set_updated_at();

-- Server-side read helper, usable from other SQL (e.g. affiliate views)
-- regardless of the caller's access to the row.
create or replace function public.get_setting(setting_key text)
returns jsonb
language sql
security definer
stable
set search_path = public
as $$
  select value from public.settings where key = setting_key;
$$;

insert into public.settings (key, is_public, description, value) values
  (
    'brand', true,
    'Public brand name, tagline and colours.',
    jsonb_build_object(
      'site_name', 'Raelo',
      'tagline', 'Better Content. Stronger Brands.',
      'primary_color', '#ed1c24',
      'dark_color', '#080d16',
      'support_email', '',
      'support_phone', ''
    )
  ),
  (
    'admin_notifications', false,
    'Who receives internal alerts (new orders, completed onboarding, affiliate applications).',
    jsonb_build_object('emails', '[]'::jsonb, 'phones', '[]'::jsonb)
  ),
  (
    'notifications', false,
    'Per-event email/SMS toggles.',
    jsonb_build_object(
      'order_paid',            jsonb_build_object('email', true,  'sms', true),
      'onboarding_reminder',   jsonb_build_object('email', true,  'sms', true),
      'onboarding_completed',  jsonb_build_object('email', true,  'sms', false),
      'content_published',     jsonb_build_object('email', true,  'sms', true),
      'subscription_renewed',  jsonb_build_object('email', true,  'sms', false),
      'subscription_expiring', jsonb_build_object('email', true,  'sms', true),
      'team_member_invited',   jsonb_build_object('email', true,  'sms', false),
      'affiliate_approved',    jsonb_build_object('email', true,  'sms', false),
      'commission_earned',     jsonb_build_object('email', true,  'sms', false),
      'payout_recorded',       jsonb_build_object('email', true,  'sms', false)
    )
  ),
  (
    'email', false,
    'Sender details and footer for outgoing email.',
    jsonb_build_object(
      'from_name', 'Raelo',
      'from_address', '',
      'reply_to', '',
      'footer_text', 'Raelo by Twin Kreative Limited'
    )
  ),
  (
    'sms', false,
    'Termii sender ID (the API key is an environment variable).',
    jsonb_build_object('sender_id', 'Raelo')
  ),
  (
    'affiliate', false,
    'Affiliate programme rules.',
    jsonb_build_object(
      'unlock_threshold', 50,
      'default_discount_percent', 10,
      'default_commission_percent', 10,
      'cookie_days', 30
    )
  ),
  (
    'ai_assistant', false,
    'Public-site AI chat widget (the Groq API key is an environment variable).',
    jsonb_build_object(
      'enabled', false,
      'model', '',
      'assistant_name', 'Raelo Assistant',
      'welcome_message', 'Hi! Ask me anything about Raelo''s packages.',
      'system_prompt', ''
    )
  )
on conflict (key) do nothing;

alter table public.settings enable row level security;

create policy "settings_select_public_or_admin"
  on public.settings for select
  to anon, authenticated
  using (is_public or public.is_admin());

create policy "settings_write_admin"
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
