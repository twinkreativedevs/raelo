# Raelo — development notes

Raelo is a standalone Next.js 16 web app on Neon Postgres (Drizzle ORM),
Better Auth and Vercel Blob. No Supabase, no WordPress. See README.md for
setup and docs/LAUNCH.md for going live.

## Commands

- `npm run lint` and `npm run typecheck` must pass before committing.
- `npm run build` must pass (no env needed; pages that read the database
  are dynamic).
- `npm run db:migrate` applies migrations to `DATABASE_URL`;
  `npm run db:pull` regenerates `lib/db/schema.ts` + `relations.ts` from it.

## Conventions

- TypeScript throughout.
- Brand colour is red `#ed1c24` with dark `#080d16`. **No purple** in any design.
- The app is light-mode only.
- Server-only modules start with `import "server-only";`.

## Database

- Never edit an existing migration. Add a new numbered file in
  `db/migrations/`, run `npm run db:migrate` then `npm run db:pull`, and
  update `lib/db/types.ts` if it adds statuses/roles. Grant new tables to
  `raelo_app` (see 0017) if signed-in users need them.
- Every new table enables RLS and gets explicit policies `to raelo_app`.
- Use the helpers in migrations 0007/0009 inside policies:
  `current_user_id()`, `is_admin()`, `is_staff()`, `current_app_role()`,
  `owns_subscription(id)`, `is_assigned_to_subscription(id)`,
  `is_assigned_to_client(id)`.
- Two ways to query (`lib/db`):
  - `asUser(tx => …)` from `requireProfile` / `requireStaff` / `authorize`
    (or `withUser(id, …)`): runs as `raelo_app` with RLS. **Default for
    anything done on behalf of a signed-in user.**
  - `db`: the owner connection, bypasses RLS (the old "service role"). Only
    for money/status/audit writes, webhooks, cron, notifications, and reads
    of server-only tables, **after** authenticating the user.
- A database refusal (RLS, trigger, constraint) throws: wrap writes and map
  errors to a friendly message; Postgres error codes are on `error.cause.code`.
- Postgres rejects malformed uuids, so check route params with `isUuid()`
  (`lib/format`) and `notFound()` before querying.
- Clients never write money, status or audit data directly.
- Profiles: users may only change their own details (`full_name`,
  `company_name`, `phone`, `avatar_url`, `account_type` and the 0019
  profile fields), enforced by `guard_profile_update`. Profiles are created
  by a trigger on Better Auth's `user` table; never take `role` from
  sign-up input.

## Sign-in

- Better Auth (`lib/better-auth.ts`, endpoints at `/api/auth/*`, browser
  client `lib/auth-client.ts`). Tables `user`, `session`, `account`,
  `verification` (migration 0000).
- Email confirmation is required only when `RESEND_API_KEY` is set.
- Invites and "set your password" use `passwordSetupLink()`; the page is
  `/auth/update-password?token=…`.
- Team login is `/compass` (`STAFF_LOGIN_PATH`); `requireStaff` and the
  proxy send signed-out `/admin` visits there.
- Bootstrap: `npm run make-admin -- <email>`. Free plans: Admin → Clients →
  Give free plan, or `npm run grant-plan`.

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
- Files live in one **private** Vercel Blob store (`lib/storage.ts`):
  content at `content/{subscription_id}/{batch_id}/{file}`, logos at
  `brand-assets/{user_id}/{file}`. Browsers upload directly with
  `upload()` from `@vercel/blob/client`; `app/api/uploads/route.ts` only
  issues a token for a path the user may write to. The follow-up server
  action (`registerUploadedItem`, `saveLogo`) re-checks the path and
  deletes the file if the record can't be saved.
- Read files only after loading the row with `asUser`, then sign a
  short-lived URL (`signedReadUrl`, `signPreviewUrls`, `signBrandAssetUrl`).
- Server actions receive arbitrary JSON: whitelist fields (see
  `sanitizeBrief` in `lib/brand-brief.ts`), never spread input into a row.

## Admin area

- Pages call `requireStaff(path, roles)`; every server action calls
  `authorize(roles)` first. Never rely on hidden buttons.
- Team roles, labels and permissions live in `lib/roles.ts` (admin,
  account manager, social media manager, content creator, designer, email
  marketer). Only admins see money; only admins/account managers publish.
  Adding a role means a migration (role checks + `is_staff()`) and
  `lib/roles.ts`.
- Admin queries run through `asUser` so RLS still applies; use `db` only
  where the notes above allow it.
- Search input goes through `ilikePattern()` (escapes `%`, `_`, `\`).
- Relations come from `lib/db/relations.ts`. Tables with two FKs to
  `profiles` name them by column, e.g. `subscription_assignments.profile_profile_id`,
  `affiliates.profile_user_id`.
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

API keys (Paystack, Termii, Groq, email, Blob, `BETTER_AUTH_SECRET`) are
environment variables only, never stored in the `settings` table. Each
optional integration checks its key and degrades gracefully when it's
missing (`paystackConfigured()`, `storageConfigured()`).

<!-- BEGIN:nextjs-agent-rules -->

# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` (resolved from this file's directory; in monorepos the `next` package may not be visible from the repo root) before writing any code. Heed deprecation notices.

This block is written and re-added by `next dev` — verify at `node_modules/next/dist/server/lib/generate-agent-files.js`. Removing it from a diff only re-creates the uncommitted change; committing it with your work keeps the tree clean.

<!-- END:nextjs-agent-rules -->
