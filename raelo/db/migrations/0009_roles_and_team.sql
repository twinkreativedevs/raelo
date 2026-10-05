-- 0009_roles_and_team.sql
-- Team roles, per-subscription assignments, and team read access.
--
-- Roles (profiles.role):
--   client           - paying customer; sees only their own data
--   admin            - full access
--   account_manager  - sees assigned clients; can publish content batches
--   designer         - sees assigned clients; uploads draft content
--
-- Team members only see clients they're assigned to via
-- subscription_assignments. Admins see everything. Deactivating a member
-- (is_active = false) removes all of their access immediately, because every
-- helper below checks it.

-- ---------------------------------------------------------------------
-- profiles: new roles + contact/status columns
-- ---------------------------------------------------------------------
alter table public.profiles drop constraint if exists profiles_role_check;
alter table public.profiles
  add constraint profiles_role_check
  check (role in ('client', 'admin', 'account_manager', 'designer'));

alter table public.profiles
  add column if not exists phone text,
  add column if not exists avatar_url text,
  add column if not exists is_active boolean not null default true;

create index if not exists profiles_role_idx on public.profiles (role);

-- Copy phone from sign-up too. Role is never copied: everything on the
-- user row comes from the sign-up form and is fully client-controlled.
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, email, phone)
  values (
    new.id,
    nullif(new.name, ''),
    new.email,
    nullif(new.phone, '')
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

-- ---------------------------------------------------------------------
-- Role helpers (SECURITY DEFINER to avoid recursive RLS on profiles)
-- ---------------------------------------------------------------------
create or replace function public.current_app_role()
returns text
language sql
security definer
stable
set search_path = public
as $$
  select p.role from public.profiles p
  where p.id = public.current_user_id() and p.is_active;
$$;

-- Redefined to also require an active account.
create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(public.current_app_role() = 'admin', false);
$$;

create or replace function public.is_staff()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select coalesce(
    public.current_app_role() in ('admin', 'account_manager', 'designer'),
    false
  );
$$;

-- ---------------------------------------------------------------------
-- subscription_assignments
-- ---------------------------------------------------------------------
create table if not exists public.subscription_assignments (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  role text not null check (role in ('account_manager', 'designer')),
  assigned_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  unique (subscription_id, profile_id)
);

comment on table public.subscription_assignments is 'Which team members work on which client subscription. Drives what designers and account managers can see.';

create index if not exists subscription_assignments_profile_id_idx
  on public.subscription_assignments (profile_id);

-- Only team members can be assigned, and only to a role they actually hold
-- (admins can fill either slot).
create or replace function public.check_assignment_role()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  member_role text;
begin
  select role into member_role from public.profiles where id = new.profile_id;

  if member_role is null or member_role = 'client' then
    raise exception 'Only team members can be assigned to a subscription.';
  end if;

  if member_role <> 'admin' and member_role <> new.role then
    raise exception 'A % cannot be assigned as %.', member_role, new.role;
  end if;

  return new;
end;
$$;

create trigger subscription_assignments_check_role
  before insert or update on public.subscription_assignments
  for each row execute function public.check_assignment_role();

-- Is the current user an active team member assigned to this subscription?
create or replace function public.is_assigned_to_subscription(sub_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1 from public.subscription_assignments a
    where a.subscription_id = sub_id and a.profile_id = public.current_user_id()
  );
$$;

-- Is the current user an active team member assigned to any subscription
-- belonging to this client?
create or replace function public.is_assigned_to_client(client_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.is_staff() and exists (
    select 1
    from public.subscription_assignments a
    join public.subscriptions s on s.id = a.subscription_id
    where s.user_id = client_id and a.profile_id = public.current_user_id()
  );
$$;

-- Does the current user own this subscription?
create or replace function public.owns_subscription(sub_id uuid)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.subscriptions s
    where s.id = sub_id and s.user_id = public.current_user_id()
  );
$$;

-- ---------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------
alter table public.subscription_assignments enable row level security;

create policy "assignments_select_related"
  on public.subscription_assignments for select
  to raelo_app
  using (
    public.is_admin()
    or (profile_id = public.current_user_id() and public.is_staff())
    or public.owns_subscription(subscription_id)
  );

create policy "assignments_write_admin"
  on public.subscription_assignments for all
  to raelo_app
  using (public.is_admin())
  with check (public.is_admin());

-- Team members can read the clients, subscriptions and briefs they work on.
create policy "profiles_select_assigned_team"
  on public.profiles for select
  to raelo_app
  using (public.is_assigned_to_client(id));

-- Clients can see the name of team members assigned to them.
create policy "profiles_select_own_team_members"
  on public.profiles for select
  to raelo_app
  using (
    exists (
      select 1
      from public.subscription_assignments a
      where a.profile_id = profiles.id
        and public.owns_subscription(a.subscription_id)
    )
  );

create policy "subscriptions_select_assigned_team"
  on public.subscriptions for select
  to raelo_app
  using (public.is_assigned_to_subscription(id));

create policy "onboarding_select_assigned_team"
  on public.onboarding_responses for select
  to raelo_app
  using (public.is_assigned_to_client(user_id));
