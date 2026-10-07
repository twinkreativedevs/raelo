-- seed.sql
-- Seeds the packages shown on the landing page (app/page.tsx). Safe to
-- re-run: upserts on slug. Keep this and the landing page copy in sync
-- until the landing page reads packages from the database.
--
-- `deliverables` is rendered as a bullet list on the checkout page.

insert into public.packages (name, slug, description, price, currency, billing_period, deliverables, active, sort_order, is_popular)
values
  (
    'Starter',
    'starter',
    'For brands getting started with consistent posting.',
    45000,
    'NGN',
    'monthly',
    '["1 brand (1 platform)", "12 posts per month", "Basic engagement support"]'::jsonb,
    true,
    1,
    false
  ),
  (
    'Growth',
    'growth',
    'For brands ready to post consistently across platforms.',
    85000,
    'NGN',
    'monthly',
    '["1 brand (2 platforms)", "24 posts per month", "Advanced engagement support"]'::jsonb,
    true,
    2,
    true
  ),
  (
    'Pro',
    'pro',
    'Full-service content production for growing brands.',
    145000,
    'NGN',
    'monthly',
    '["1 brand (3 platforms)", "40 posts per month", "Premium engagement support"]'::jsonb,
    true,
    3,
    false
  ),
  (
    'Business',
    'business',
    'For agencies and businesses running several brands.',
    320000,
    'NGN',
    'monthly',
    '["Multiple brands (up to 5)", "Custom post volume", "Dedicated account manager"]'::jsonb,
    true,
    4,
    false
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  billing_period = excluded.billing_period,
  deliverables = excluded.deliverables,
  active = excluded.active,
  sort_order = excluded.sort_order,
  is_popular = excluded.is_popular;

-- The top tier used to be seeded as 'agency'. Retire it rather than delete
-- it, in case a subscription already references it.
update public.packages set active = false where slug = 'agency';
