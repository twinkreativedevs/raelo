-- 0007_rls_policies.sql
-- Enables RLS on every app table and defines the access rules from the spec.
--
-- Design notes:
-- * is_admin() is SECURITY DEFINER so it can read public.profiles without
--   triggering recursive RLS checks on profiles itself.
-- * The service-role key (used only in trusted server code, e.g. the
--   Paystack webhook / verification route) bypasses RLS entirely, so
--   sensitive transitions like "pending -> active" don't need a client
--   policy at all.
-- * RLS only enforces WHO can touch a row. Business rules like "a client
--   may only move status from draft -> approved, not draft -> delivered"
--   still belong in the server action / route handler (step 8), not here.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles p
    where p.id = auth.uid() and p.role = 'admin'
  );
$$;

-- ---------------------------------------------------------------------
-- profiles
-- ---------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_own_or_admin"
  on public.profiles for select
  to authenticated
  using (id = auth.uid() or public.is_admin());

create policy "profiles_update_own_or_admin"
  on public.profiles for update
  to authenticated
  using (id = auth.uid() or public.is_admin())
  with check (id = auth.uid() or public.is_admin());

-- Rows are normally created by the handle_new_user trigger (security
-- definer, bypasses RLS). This policy only covers admin-initiated inserts.
create policy "profiles_insert_admin"
  on public.profiles for insert
  to authenticated
  with check (public.is_admin());

create policy "profiles_delete_admin"
  on public.profiles for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- packages
-- ---------------------------------------------------------------------
alter table public.packages enable row level security;

-- Anyone (including signed-out visitors on the landing page) can read
-- active packages. Admins can read everything, including inactive ones.
create policy "packages_select_active_or_admin"
  on public.packages for select
  to anon, authenticated
  using (active = true or public.is_admin());

create policy "packages_insert_admin"
  on public.packages for insert
  to authenticated
  with check (public.is_admin());

create policy "packages_update_admin"
  on public.packages for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "packages_delete_admin"
  on public.packages for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- subscriptions
-- ---------------------------------------------------------------------
alter table public.subscriptions enable row level security;

create policy "subscriptions_select_own_or_admin"
  on public.subscriptions for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

-- A client may create their own PENDING subscription at checkout init.
-- Any other status must come from the server (service role) or an admin.
create policy "subscriptions_insert_own_pending_or_admin"
  on public.subscriptions for insert
  to authenticated
  with check (
    (user_id = auth.uid() and status = 'pending')
    or public.is_admin()
  );

-- Clients cannot flip their own status (e.g. pending -> active) directly;
-- that only happens via the service-role verification route or an admin.
create policy "subscriptions_update_admin"
  on public.subscriptions for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

create policy "subscriptions_delete_admin"
  on public.subscriptions for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- onboarding_responses
-- ---------------------------------------------------------------------
alter table public.onboarding_responses enable row level security;

create policy "onboarding_select_own_or_admin"
  on public.onboarding_responses for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "onboarding_insert_own_or_admin"
  on public.onboarding_responses for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

create policy "onboarding_update_own_or_admin"
  on public.onboarding_responses for update
  to authenticated
  using (user_id = auth.uid() or public.is_admin())
  with check (user_id = auth.uid() or public.is_admin());

create policy "onboarding_delete_admin"
  on public.onboarding_responses for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- content_items
-- ---------------------------------------------------------------------
alter table public.content_items enable row level security;

create policy "content_items_select_own_or_admin"
  on public.content_items for select
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.id = content_items.subscription_id
        and s.user_id = auth.uid()
    )
  );

-- Clients may update items on their own subscriptions (e.g. approve /
-- request changes); the server action layer should restrict *which*
-- fields and status transitions are actually allowed for a client.
create policy "content_items_update_own_or_admin"
  on public.content_items for update
  to authenticated
  using (
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.id = content_items.subscription_id
        and s.user_id = auth.uid()
    )
  )
  with check (
    public.is_admin()
    or exists (
      select 1 from public.subscriptions s
      where s.id = content_items.subscription_id
        and s.user_id = auth.uid()
    )
  );

create policy "content_items_insert_admin"
  on public.content_items for insert
  to authenticated
  with check (public.is_admin());

create policy "content_items_delete_admin"
  on public.content_items for delete
  to authenticated
  using (public.is_admin());

-- ---------------------------------------------------------------------
-- activity_events (append-only audit log)
-- ---------------------------------------------------------------------
alter table public.activity_events enable row level security;

create policy "activity_events_select_own_or_admin"
  on public.activity_events for select
  to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "activity_events_insert_own_or_admin"
  on public.activity_events for insert
  to authenticated
  with check (user_id = auth.uid() or public.is_admin());

-- Intentionally no update/delete policies for anyone (including admins)
-- via the client. The service role can still manage rows directly if
-- ever needed (e.g. GDPR erasure), since it bypasses RLS.
