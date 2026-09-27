# Raelo — development notes

Raelo is a standalone Next.js 16 + Supabase web app (no WordPress). See
README.md for setup and docs/LAUNCH.md for going live.

## Commands

- `npm run lint` and `npx tsc --noEmit` must pass before committing.
- `npm run build` must pass (it needs `NEXT_PUBLIC_SUPABASE_URL` and
  `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` set; dummy values work).

## Conventions

- TypeScript throughout.
- Brand colour is red `#ed1c24` with dark `#080d16`. **No purple** in any design.
- The app is light-mode only.
- Server-only modules start with `import "server-only";`.

## Database

- Never edit an existing migration. Add a new numbered file in
  `supabase/migrations/` and update `lib/supabase/database.types.ts`.
- Every new table enables RLS and gets explicit policies.
- Use the helpers in migrations 0007/0009 inside policies: `is_admin()`,
  `is_staff()`, `current_app_role()`, `owns_subscription(id)`,
  `is_assigned_to_subscription(id)`, `is_assigned_to_client(id)`.
- Clients never write money, status or audit data directly. Those writes go
  through server code with `createAdminClient()` (service role) **after**
  authenticating the user.
- Profiles: users may only change `full_name`, `company_name`, `phone`,
  `avatar_url` (enforced by a trigger). Never read `role` from user metadata.

## Payments

- Prices always come from the database, never the client.
- An `orders` row is created per payment attempt and stores the exact amount.
  `lib/payments.ts#confirmOrderPayment` is the only place that marks an order
  paid, activates a subscription and issues an invoice. It is idempotent and
  shared by `/checkout/verify`, the webhook and renewals.
- Renewals are ordinary orders with `kind = 'renewal'` (see `lib/renewals.ts`).
  A unique index allows only one pending renewal per subscription.
- `payment_methods.authorization_code` is chargeable: never select it into
  anything sent to the browser.

## Content

- Content is always created in a **draft** batch. Only admins/account
  managers can publish (enforced by trigger). Clients only see published
  batches.
- Content files live in the private `content` bucket at
  `{subscription_id}/{batch_id}/{file}`. Clients download via signed URLs
  created server-side.
- Brand assets live in the private `brand-assets` bucket at `{user_id}/{file}`.
  Logos are uploaded straight from the browser (storage RLS limits users to
  their own folder); `saveLogo` re-checks the path before storing it.
- Server actions receive arbitrary JSON: whitelist fields (see
  `sanitizeBrief` in `lib/brand-brief.ts`), never spread input into a row.

## Admin area

- Pages call `requireStaff(path, roles)`; every server action calls
  `authorize(roles)` first. Never rely on hidden buttons.
- Admin queries use the signed-in user's client so RLS still applies; use
  `createAdminClient()` only for auth admin APIs (invites) and storage signing.
- Search input goes through `ilikePattern()` (escapes `%`, `_`, `\`).
- When a table has two FKs to `profiles` (`subscription_assignments`,
  `content_batches`, `affiliates`), embed with an explicit hint, e.g.
  `profiles!subscription_assignments_profile_id_fkey(...)`, or PostgREST
  rejects the whole query.
- Edit forms submit with `onSubmit` + `new FormData(...)`, not the `action`
  prop: React 19 resets uncontrolled fields after a form action.

## Notifications, affiliates, assistant

- Send messages with `notifyUser` / `notifyAdmins` / `notifyStaff` from
  `lib/notifications`, wrapped in `afterResponse(() => …)` so the response
  never waits on a provider. They never throw and always log to
  `notification_log`. New events: add a template, a toggle in
  `lib/settings-schema.ts`, and (if repeatable) a `dedupeKey`.
- Referral discounts and commissions only go through `lib/affiliates.ts`
  (`resolveReferral`, `referralDiscount`, `recordCommission`); checkout
  page and action must agree on the price.
- `*_API_URL` / `TERMII_BASE_URL` env overrides exist for tests and Termii's
  per-account hosts; never point them anywhere else in production.

## Secrets

API keys (Paystack, Termii, Groq, email) are environment variables only,
never stored in the `settings` table.
