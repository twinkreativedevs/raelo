-- seed.sql
-- Seeds the packages table with the values currently hardcoded on the
-- landing page (app/page.tsx). Safe to re-run: upserts on slug.
--
-- `deliverables` is a starting-point JSONB shape (frontend can render it
-- as a bullet list on the package/checkout page) -- adjust the actual
-- copy to match what you want to promise clients before going live.

insert into public.packages (name, slug, description, price, currency, billing_period, deliverables, active)
values
  (
    'Starter',
    'starter',
    'Entry-level social content package.',
    45000,
    'NGN',
    'monthly',
    '["4 posts per month", "1 platform", "Monthly content calendar"]'::jsonb,
    true
  ),
  (
    'Growth',
    'growth',
    'For brands ready to post consistently across platforms.',
    85000,
    'NGN',
    'monthly',
    '["8 posts per month", "2 platforms", "Monthly content calendar", "Basic performance summary"]'::jsonb,
    true
  ),
  (
    'Pro',
    'pro',
    'Full-service content production for growing brands.',
    145000,
    'NGN',
    'monthly',
    '["16 posts per month", "3 platforms", "Content calendar + strategy call", "Monthly performance report"]'::jsonb,
    true
  ),
  (
    'Agency',
    'agency',
    'Highest-volume package for agencies and larger teams.',
    320000,
    'NGN',
    'monthly',
    '["Unlimited posts", "All platforms", "Dedicated content lead", "Weekly reporting"]'::jsonb,
    true
  )
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  price = excluded.price,
  currency = excluded.currency,
  billing_period = excluded.billing_period,
  deliverables = excluded.deliverables,
  active = excluded.active;
