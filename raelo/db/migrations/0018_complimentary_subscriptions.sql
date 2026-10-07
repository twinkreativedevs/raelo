-- 0018_complimentary_subscriptions.sql
-- Subscriptions an admin grants without payment (demos, partners, the
-- team's own test account). They have no order or invoice, never renew
-- automatically, and are left out of recurring-revenue figures.

alter table public.subscriptions
  add column if not exists complimentary boolean not null default false;

comment on column public.subscriptions.complimentary is
  'Granted by an admin without payment. Excluded from MRR; never auto-renews.';
