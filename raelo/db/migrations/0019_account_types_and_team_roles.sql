-- 0019_account_types_and_team_roles.sql
-- 1. Clients sign up as an individual or an organization, and can keep a
--    fuller profile (job title, website, industry, team size, location, bio).
-- 2. Three more team roles: content_creator, email_marketer and
--    social_media_manager. They work like designers: they see the clients
--    they're assigned to and can upload draft content, but can't publish or
--    see money (publishing stays with admins and account managers, 0011).

-- ---------------------------------------------------------------------
-- 1. Account type + profile details
-- ---------------------------------------------------------------------
alter table public.profiles
  add column if not exists account_type text not null default 'individual',
  add column if not exists job_title text,
  add column if not exists website text,
  add column if not exists industry text,
  add column if not exists team_size text,
  add column if not exists city text,
  add column if not exists country text,
  add column if not exists bio text;

alter table public.profiles drop constraint if exists profiles_account_type_check;
alter table public.profiles
  add constraint profiles_account_type_check
  check (account_type in ('individual', 'organization'));

-- Sign-up fields on Better Auth's user row (additionalFields in
-- lib/better-auth.ts). Client-controlled, so the trigger below validates
-- them before copying.
alter table public."user"
  add column if not exists "accountType" text,
  add column if not exists "companyName" text;

create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone, account_type, company_name)
  values (
    new.id,
    nullif(new.name, ''),
    new.email,
    nullif(new.phone, ''),
    case when new."accountType" = 'organization' then 'organization' else 'individual' end,
    nullif(left(trim(coalesce(new."companyName", '')), 200), '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- Users may edit the new details on their own row (role, email, is_active
-- and everything else stay locked).
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  self_editable constant text[] := array[
    'full_name', 'company_name', 'phone', 'avatar_url', 'updated_at',
    'account_type', 'job_title', 'website', 'industry', 'team_size',
    'city', 'country', 'bio'
  ];
begin
  if public.current_user_id() is null or public.is_admin() then
    return new;
  end if;

  if (to_jsonb(new) - self_editable) is distinct from (to_jsonb(old) - self_editable) then
    raise exception 'You can only update your own profile details.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- 2. Team roles
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in (
    'client', 'admin', 'account_manager', 'designer',
    'content_creator', 'email_marketer', 'social_media_manager'
  ));

alter table public.subscription_assignments
  drop constraint if exists subscription_assignments_role_check;
alter table public.subscription_assignments
  add constraint subscription_assignments_role_check
  check (role in (
    'account_manager', 'designer',
    'content_creator', 'email_marketer', 'social_media_manager'
  ));

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    public.current_app_role() in (
      'admin', 'account_manager', 'designer',
      'content_creator', 'email_marketer', 'social_media_manager'
    ),
    false
  );
$$;
