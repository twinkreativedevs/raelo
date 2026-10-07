-- 0000_platform.sql
-- Platform pieces the rest of the schema builds on (Neon / plain Postgres).
--
-- How access control works:
-- * Server code connects as the database owner (DATABASE_URL). That
--   connection bypasses Row Level Security; it's what older comments in
--   these migrations call "the service role". Use it only after the user
--   has been authenticated and authorised in server code.
-- * Requests made on behalf of a signed-in user run inside a transaction
--   that switches to the `raelo_app` role and sets `app.user_id` (see
--   lib/db/index.ts#withUser). RLS policies are written `to raelo_app` and
--   call public.current_user_id() to see who is asking.

-- ---------------------------------------------------------------------
-- Role used for user-scoped queries
-- ---------------------------------------------------------------------
do $$
begin
  if not exists (select 1 from pg_roles where rolname = 'raelo_app') then
    create role raelo_app nologin;
  end if;
end
$$;

-- The owner must be able to `set role raelo_app` inside a transaction.
grant raelo_app to current_user;

-- The signed-in user for this transaction, or null for the owner
-- connection, migrations and scripts.
create or replace function public.current_user_id()
returns uuid
language sql
stable
as $$
  select nullif(current_setting('app.user_id', true), '')::uuid
$$;

-- ---------------------------------------------------------------------
-- Better Auth tables (email + password sign-in). Column names follow
-- Better Auth's defaults; ids are uuids so profiles.id can reference them.
-- ---------------------------------------------------------------------
create table if not exists public."user" (
  id uuid primary key default gen_random_uuid(),
  name text not null default '',
  email text not null unique,
  "emailVerified" boolean not null default false,
  image text,
  -- Extra sign-up field (Better Auth additionalFields), copied to profiles.
  phone text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create table if not exists public.session (
  id uuid primary key default gen_random_uuid(),
  "expiresAt" timestamptz not null,
  token text not null unique,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now(),
  "ipAddress" text,
  "userAgent" text,
  "userId" uuid not null references public."user" (id) on delete cascade
);

create index if not exists session_user_id_idx on public.session ("userId");

create table if not exists public.account (
  id uuid primary key default gen_random_uuid(),
  "accountId" text not null,
  "providerId" text not null,
  "userId" uuid not null references public."user" (id) on delete cascade,
  "accessToken" text,
  "refreshToken" text,
  "idToken" text,
  "accessTokenExpiresAt" timestamptz,
  "refreshTokenExpiresAt" timestamptz,
  scope text,
  password text,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists account_user_id_idx on public.account ("userId");

create table if not exists public.verification (
  id uuid primary key default gen_random_uuid(),
  identifier text not null,
  value text not null,
  "expiresAt" timestamptz not null,
  "createdAt" timestamptz not null default now(),
  "updatedAt" timestamptz not null default now()
);

create index if not exists verification_identifier_idx on public.verification (identifier);

-- Auth tables are server-only: no RLS policies, no grants to raelo_app.
alter table public."user" enable row level security;
alter table public.session enable row level security;
alter table public.account enable row level security;
alter table public.verification enable row level security;
