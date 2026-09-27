-- 0011_content_batches_and_storage.sql
-- Content is delivered in batches (typically one per month). A batch starts
-- as a draft that only the team can see; clients see a batch and its items
-- only once an admin or account manager publishes it.
--
-- Files live in private Storage buckets:
--   content       {subscription_id}/{batch_id}/{file}  - uploaded by the team
--   brand-assets  {user_id}/{file}                     - logos etc. from onboarding
-- Clients download content through short-lived signed URLs created on the
-- server after checking the batch is published, so they get no direct read
-- policy on the content bucket.

-- ---------------------------------------------------------------------
-- content_batches
-- ---------------------------------------------------------------------
create table if not exists public.content_batches (
  id uuid primary key default gen_random_uuid(),
  subscription_id uuid not null references public.subscriptions (id) on delete cascade,
  title text not null,
  period_start date,
  status text not null default 'draft' check (status in ('draft', 'published')),
  -- Shown to the client when published.
  client_message text,
  -- Team-only notes.
  internal_notes text,
  published_at timestamptz,
  published_by uuid references public.profiles (id) on delete set null,
  created_by uuid references public.profiles (id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

comment on table public.content_batches is 'A delivery of content for one subscription. Always created as draft; only admins/account managers can publish.';

create trigger content_batches_set_updated_at
  before update on public.content_batches
  for each row execute function public.set_updated_at();

create index if not exists content_batches_subscription_id_idx on public.content_batches (subscription_id);
create index if not exists content_batches_status_idx on public.content_batches (status);

-- Only admins and account managers may publish/unpublish. Stamps
-- published_at/published_by automatically.
create or replace function public.guard_batch_publish()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if tg_op = 'INSERT' then
    if new.status = 'published' and auth.uid() is not null then
      raise exception 'New batches must start as draft.';
    end if;
    new.created_by := coalesce(new.created_by, auth.uid());
    return new;
  end if;

  if new.status is distinct from old.status then
    if auth.uid() is not null
       and coalesce(public.current_app_role(), '') not in ('admin', 'account_manager') then
      raise exception 'Only admins and account managers can publish content.'
        using errcode = '42501';
    end if;

    if new.status = 'published' then
      new.published_at := now();
      new.published_by := auth.uid();
    else
      new.published_at := null;
      new.published_by := null;
    end if;
  end if;

  return new;
end;
$$;

create trigger content_batches_guard_publish
  before insert or update on public.content_batches
  for each row execute function public.guard_batch_publish();

-- ---------------------------------------------------------------------
-- content_items: link to batches + storage metadata
-- ---------------------------------------------------------------------
alter table public.content_items
  add column if not exists batch_id uuid references public.content_batches (id) on delete cascade,
  add column if not exists storage_path text,
  add column if not exists file_name text,
  add column if not exists mime_type text,
  add column if not exists file_size_bytes bigint,
  add column if not exists sort_order integer not null default 0,
  add column if not exists uploaded_by uuid references public.profiles (id) on delete set null;

create index if not exists content_items_batch_id_idx on public.content_items (batch_id);

-- An item's batch must belong to the same subscription as the item.
create or replace function public.check_content_item_batch()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.batch_id is not null and not exists (
    select 1 from public.content_batches b
    where b.id = new.batch_id and b.subscription_id = new.subscription_id
  ) then
    raise exception 'Content item batch belongs to a different subscription.';
  end if;
  return new;
end;
$$;

create trigger content_items_check_batch
  before insert or update on public.content_items
  for each row execute function public.check_content_item_batch();

-- Can a client see this item? Published batch, or (for legacy rows without
-- a batch) an item already marked delivered.
create or replace function public.client_can_see_content_item(item public.content_items)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select public.owns_subscription(item.subscription_id)
    and (
      (item.batch_id is null and item.status = 'delivered')
      or exists (
        select 1 from public.content_batches b
        where b.id = item.batch_id and b.status = 'published'
      )
    );
$$;

-- ---------------------------------------------------------------------
-- onboarding_responses: uploaded logo + per-platform handles
-- ---------------------------------------------------------------------
alter table public.onboarding_responses
  add column if not exists logo_path text,
  add column if not exists social_handles jsonb not null default '{}'::jsonb;

comment on column public.onboarding_responses.logo_path is 'Path inside the brand-assets bucket, e.g. {user_id}/logo.png';
comment on column public.onboarding_responses.social_handles is 'e.g. {"Instagram": "@acme", "TikTok": "@acme.ng"}';

-- ---------------------------------------------------------------------
-- RLS: content_batches
-- ---------------------------------------------------------------------
alter table public.content_batches enable row level security;

create policy "content_batches_select"
  on public.content_batches for select
  to authenticated
  using (
    public.is_admin()
    or public.is_assigned_to_subscription(subscription_id)
    or (status = 'published' and public.owns_subscription(subscription_id))
  );

create policy "content_batches_insert_team"
  on public.content_batches for insert
  to authenticated
  with check (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  );

create policy "content_batches_update_team"
  on public.content_batches for update
  to authenticated
  using (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  )
  with check (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  );

create policy "content_batches_delete_team_draft"
  on public.content_batches for delete
  to authenticated
  using (
    public.is_admin()
    or (status = 'draft' and public.is_assigned_to_subscription(subscription_id))
  );

-- ---------------------------------------------------------------------
-- RLS: content_items (replaces the 0007/0008 policies)
-- ---------------------------------------------------------------------
drop policy if exists "content_items_select_own_or_admin" on public.content_items;
drop policy if exists "content_items_insert_admin" on public.content_items;
drop policy if exists "content_items_update_admin" on public.content_items;
drop policy if exists "content_items_delete_admin" on public.content_items;

create policy "content_items_select"
  on public.content_items for select
  to authenticated
  using (
    public.is_admin()
    or public.is_assigned_to_subscription(subscription_id)
    or public.client_can_see_content_item(content_items)
  );

create policy "content_items_insert_team"
  on public.content_items for insert
  to authenticated
  with check (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  );

create policy "content_items_update_team"
  on public.content_items for update
  to authenticated
  using (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  )
  with check (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  );

create policy "content_items_delete_team"
  on public.content_items for delete
  to authenticated
  using (
    public.is_admin() or public.is_assigned_to_subscription(subscription_id)
  );

-- ---------------------------------------------------------------------
-- Storage buckets + policies
-- ---------------------------------------------------------------------
insert into storage.buckets (id, name, public)
values
  ('content', 'content', false),
  ('brand-assets', 'brand-assets', false)
on conflict (id) do nothing;

-- Parses the first folder of an object path as a uuid; null if it isn't one.
create or replace function public.storage_path_uuid(object_name text)
returns uuid
language plpgsql
immutable
as $$
begin
  return split_part(object_name, '/', 1)::uuid;
exception when invalid_text_representation then
  return null;
end;
$$;

-- content bucket: team only. Clients get signed URLs from the server.
create policy "content_bucket_select_team"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'content'
    and (
      public.is_admin()
      or public.is_assigned_to_subscription(public.storage_path_uuid(name))
    )
  );

create policy "content_bucket_insert_team"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'content'
    and (
      public.is_admin()
      or public.is_assigned_to_subscription(public.storage_path_uuid(name))
    )
  );

create policy "content_bucket_update_team"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'content'
    and (
      public.is_admin()
      or public.is_assigned_to_subscription(public.storage_path_uuid(name))
    )
  );

create policy "content_bucket_delete_team"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'content'
    and (
      public.is_admin()
      or public.is_assigned_to_subscription(public.storage_path_uuid(name))
    )
  );

-- brand-assets bucket: the client manages their own folder; assigned team
-- and admins can read it.
create policy "brand_assets_select"
  on storage.objects for select
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (
      public.storage_path_uuid(name) = auth.uid()
      or public.is_admin()
      or public.is_assigned_to_client(public.storage_path_uuid(name))
    )
  );

create policy "brand_assets_insert_own"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'brand-assets'
    and public.storage_path_uuid(name) = auth.uid()
  );

create policy "brand_assets_update_own"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and public.storage_path_uuid(name) = auth.uid()
  );

create policy "brand_assets_delete_own"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'brand-assets'
    and (public.storage_path_uuid(name) = auth.uid() or public.is_admin())
  );
