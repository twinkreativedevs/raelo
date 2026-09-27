-- 0008_security_hardening.sql
-- Closes holes in the original 0007 policies.
--
-- 1. Privilege escalation: profiles_update_own_or_admin let a client update
--    *any* column of their own row, including `role`. Anyone with the public
--    key could run `update profiles set role = 'admin'` from the browser.
--    RLS can't restrict columns, so a trigger now rejects changes to anything
--    outside a small allow-list unless the caller is an admin or the service
--    role. New columns are protected by default.
--
-- 2. Content: clients could update any column of their content items
--    (asset_url, status -> 'delivered', ...). Client feedback on content will
--    go through server actions instead, so the client UPDATE policy is gone.
--    (Client SELECT is narrowed to published content in 0011.)
--
-- 3. Audit log: clients could insert arbitrary activity_events for
--    themselves (e.g. a fake 'payment_completed'). Events are now written by
--    trusted server code only (service role, which bypasses RLS) or admins.
--
-- 4. Subscriptions: checkout now creates the pending subscription + order
--    with the service role after authenticating the user server-side (see
--    app/checkout/actions.ts), so clients no longer need INSERT at all.

-- ---------------------------------------------------------------------
-- 1. profiles: guard privileged columns
-- ---------------------------------------------------------------------
create or replace function public.guard_profile_update()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  -- Columns a user may change on their own row.
  self_editable constant text[] := array[
    'full_name', 'company_name', 'phone', 'avatar_url', 'updated_at'
  ];
begin
  -- auth.uid() is null for the service role / SQL editor / migrations.
  if auth.uid() is null or public.is_admin() then
    return new;
  end if;

  if (to_jsonb(new) - self_editable) is distinct from (to_jsonb(old) - self_editable) then
    raise exception 'You can only update your name, company, phone and avatar.'
      using errcode = '42501';
  end if;

  return new;
end;
$$;

drop trigger if exists profiles_guard_update on public.profiles;
create trigger profiles_guard_update
  before update on public.profiles
  for each row execute function public.guard_profile_update();

-- ---------------------------------------------------------------------
-- 2. content_items: no direct client updates
-- ---------------------------------------------------------------------
drop policy if exists "content_items_update_own_or_admin" on public.content_items;

create policy "content_items_update_admin"
  on public.content_items for update
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 3. activity_events: server/admin writes only
-- ---------------------------------------------------------------------
drop policy if exists "activity_events_insert_own_or_admin" on public.activity_events;

create policy "activity_events_insert_admin"
  on public.activity_events for insert
  to authenticated
  with check (public.is_admin());

-- ---------------------------------------------------------------------
-- 4. subscriptions: no client inserts
-- ---------------------------------------------------------------------
drop policy if exists "subscriptions_insert_own_pending_or_admin" on public.subscriptions;

create policy "subscriptions_insert_admin"
  on public.subscriptions for insert
  to authenticated
  with check (public.is_admin());
