-- 0017_app_role_grants.sql
-- Table privileges for raelo_app (see 0000). RLS policies decide which rows
-- it can see or change; these grants only decide which tables it may touch
-- at all. Server-only tables (auth, payment methods, webhook log, rate
-- limits, notification log writes) are deliberately left out.

grant usage on schema public to raelo_app;

grant select, insert, update, delete on
  public.profiles,
  public.packages,
  public.subscriptions,
  public.subscription_assignments,
  public.onboarding_responses,
  public.content_batches,
  public.content_items,
  public.activity_events,
  public.orders,
  public.invoices,
  public.settings,
  public.affiliates,
  public.commissions,
  public.payouts,
  public.notification_log
to raelo_app;

grant select on public.affiliate_balances to raelo_app;

grant usage, select on all sequences in schema public to raelo_app;

-- Helper functions used inside policies and by the app.
grant execute on function
  public.current_user_id(),
  public.is_admin(),
  public.is_staff(),
  public.current_app_role(),
  public.owns_subscription(uuid),
  public.is_assigned_to_subscription(uuid),
  public.is_assigned_to_client(uuid),
  public.get_setting(text)
to raelo_app;
