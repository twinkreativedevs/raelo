# Raelo

**Built by Twin Kreative**

Raelo is a done-for-you social media content subscription. Clients pick a
monthly package, pay with Paystack, complete a brand brief, and download
professionally designed content from a private portal.

A standalone web app: marketing site, checkout, client portal, team
workspace and admin, all in one Next.js project backed by Neon Postgres.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, server actions, `proxy.ts`)
- [Neon](https://neon.tech) Postgres, queried with [Drizzle ORM](https://orm.drizzle.team);
  Row Level Security decides what each signed-in user can see
- [Better Auth](https://www.better-auth.com): email + password sign-in, stored in the same database
- [Vercel Blob](https://vercel.com/docs/vercel-blob) (private store) for content files and logos
- Paystack for payments, Resend for email, Termii for SMS, Groq for the chat assistant
- Tailwind CSS + shadcn/ui, TypeScript

## Getting started

Only a database is needed to run the site. Payments, email, SMS, uploads
and the assistant switch themselves on when their keys are added.

1. Create a Neon project and copy its **pooled** connection string.
2. Copy `.env.example` to `.env.local` and fill in the **Required** block
   (`DATABASE_URL`, `BETTER_AUTH_SECRET`, `NEXT_PUBLIC_SITE_URL`, `CRON_SECRET`).
3. Install, create the tables, and run:

   ```bash
   npm install
   npm run db:migrate   # applies db/migrations in order, then db/seed.sql
   npm run dev
   ```

4. Sign up at `/auth/sign-up`. Without email configured you're signed in
   straight away.
5. Make yourself the first admin, then open `/admin` (sign out and in first):

   ```bash
   npm run make-admin -- you@example.com
   ```

   After that, invite everyone else from **Admin → Team**.

### Using the portal before payments are connected

Until `PAYSTACK_SECRET_KEY` is set, checkout shows "online payment opens
soon" instead of a pay button. To give a client account a working plan
(for a demo, a partner, or your own test account):

- **Admin → Clients → client → Give free plan** (pick a package and 1–12 months), or
- `npm run grant-plan -- client@example.com growth 3`

Free plans are marked complimentary: no order or invoice, never charged,
left out of recurring revenue. If the client later pays for a renewal it
becomes a normal paid subscription. An account is either a client or a
team member, so use a second email (e.g. `you+client@example.com`) to see
the client portal yourself.

### Schema changes

Migrations are plain SQL in `db/migrations/`, applied once each by
`npm run db:migrate` (tracked in `schema_migrations`). After adding one,
run `npm run db:pull` to regenerate the typed schema in `lib/db/schema.ts`.

### Paystack

- Checkout sends customers to Paystack and back to `/checkout/verify`.
- In the Paystack dashboard (**Settings → API Keys & Webhooks**) set the
  webhook URL to `https://<your-site>/api/webhooks/paystack`. It confirms
  payments even if the customer closes the tab before returning, and
  completes asynchronous renewal charges. Every delivery is logged in
  `paystack_events`.

### Recurring billing

The first card payment saves a reusable Paystack authorization. A daily cron
(`vercel.json` → `/api/cron/billing`, 07:00 UTC) then:

1. charges saved cards for subscriptions ending within 24 hours (up to 3
   attempts, at least 20 hours apart);
2. marks subscriptions `expired` 3 days after their period ends.

Set `CRON_SECRET`; Vercel Cron sends it automatically. On other hosts, call
`GET /api/cron/billing` daily with `Authorization: Bearer $CRON_SECRET`.
Clients who paid by bank transfer or USSD (not reusable) renew with **Renew
now** in the portal, where they can also turn auto-renew off.

Paid orders get a numbered invoice; clients download it as PDF from the
portal (`/api/invoices/<id>`).

### Notifications (email + SMS)

Email goes out through [Resend](https://resend.com) (`RESEND_API_KEY`, sender
from **Admin → Settings → Email**) and SMS through [Termii](https://termii.com)
(`TERMII_API_KEY`, `TERMII_BASE_URL`, sender ID in Settings). Once Resend is
set, sign-up asks new users to confirm their email, and password resets and
team invites are emailed (before that, invite links are shown to the admin
and, in development, printed to the server console). Each event can be
switched on/off per channel in **Settings → Notifications**. Every attempt,
including failures and "skipped: no API key", is listed in **Admin → Activity
log → Messages**.

| Event | Goes to |
| --- | --- |
| Payment received / welcome, renewal, couldn't renew, time to renew | Client |
| Brand brief reminder (daily cron, max 3) | Client |
| New content published | Client |
| New order, brief completed, affiliate application | Admin alert list (+ assigned team for briefs) |
| Affiliate approved, commission earned, payout sent | Affiliate |

### Affiliate programme

People apply at `/affiliate`; admins approve them in **Admin → Affiliates**.
A referral link (`/?ref=code`) sets a cookie; within `cookie_days` the
referred customer gets the affiliate's discount on their **first** payment
and the affiliate earns their commission rate on what was paid. Commissions
become payable after `unlock_threshold` confirmed sales (default 50);
**Record payout** settles everything earned in one go. Refunds void unpaid
commissions. Affiliates can't use their own link.

### AI assistant

A chat widget on the landing page, answered by [Groq](https://console.groq.com)
(`GROQ_API_KEY`). Turn it on and edit its model, name, welcome message and
extra knowledge in **Settings → AI assistant**; live packages and prices are
included automatically. Groq model ids change without notice, so if replies stop,
update the model there. Rate limited per visitor and site-wide.

## Admin & team area (`/admin`)

Staff sign in at `/auth/login` like clients and land on `/admin`. The sidebar
adapts to the role:

| Section | Admin | Account manager | Designer |
| --- | :---: | :---: | :---: |
| Dashboard (stats, revenue chart, search) | ✓ | their clients | their clients |
| Clients (brief, logo, subscriptions, team) | all | assigned | assigned |
| Content (batches, uploads, captions) | all | assigned, **can publish** | assigned, drafts only |
| Orders (filters, CSV, mark refunded) | ✓ | | |
| Packages, Revenue, Invoices, Affiliates, Team, Activity log, Settings | ✓ | | |

Workflow: an admin invites team members (**Team**), assigns a designer and
account manager to each client (**Clients → client**), the designer creates a
batch and uploads files as drafts, and the account manager publishes it,
at which point it appears in the client's portal.

## Going live

Follow **[docs/LAUNCH.md](docs/LAUNCH.md)**. `GET /api/health` reports
whether the database and required settings are in place.

## Scripts

| Command                                  | What it does                                   |
| ---------------------------------------- | ---------------------------------------------- |
| `npm run dev`                            | Dev server on :3000                            |
| `npm run build`                          | Production build                               |
| `npm run lint` / `npm run typecheck`     | ESLint / TypeScript                            |
| `npm run db:migrate`                     | Apply new migrations + seed packages           |
| `npm run db:pull`                        | Regenerate `lib/db/schema.ts` after a migration |
| `npm run make-admin -- <email> [role]`   | Promote an account (default: admin)            |
| `npm run grant-plan -- <email> [slug] [months]` | Give a client a free plan                 |

Scripts read `DATABASE_URL` from `.env.local`. CI (`.github/workflows/ci.yml`)
runs lint, typecheck, migrations on a fresh Postgres, and the build.

## Access model

Every table has Row Level Security. In short:

| Role              | Can see                                                        |
| ----------------- | -------------------------------------------------------------- |
| `client`          | Their own profile, subscriptions, orders, invoices, brief, and **published** content |
| `designer`        | Clients/subscriptions they're assigned to; can upload draft content |
| `account_manager` | Same as designer, and can publish content batches              |
| `admin`           | Everything                                                     |

Requests made for a signed-in user run as the database role `raelo_app`
with `app.user_id` set (`asUser` / `withUser` in `lib/db`), so these
policies apply exactly as written in `db/migrations/0007`–`0013`. Sensitive
writes (activating subscriptions, orders, invoices, the audit log) happen
only in server code on the owner connection, after the user has been
checked. Files are in a private Blob store: uploads are authorised by
`/api/uploads`, downloads use short-lived signed links.

## Project layout

```
app/
  page.tsx               Landing page
  terms/ privacy/ refunds/  Legal pages
  auth/                  Login, sign-up, password reset / set password
  checkout/[slug]/       Package page + pay button
  checkout/verify/       Paystack callback
  api/auth/              Better Auth endpoints
  api/uploads/           Upload tokens for the private Blob store
  api/webhooks/paystack/ Paystack webhook
  api/cron/billing/      Daily renewals + expiry
  api/invoices/[id]/     Invoice PDF download
  api/content/           Content downloads (single file + batch zip)
  api/assistant/         AI chat endpoint (Groq, rate limited)
  api/health/            Health check
  affiliate/             Public affiliate programme + dashboard
  onboarding/            Brand brief wizard (first time)
  portal/                Client portal: overview, content, brand, billing, account
  admin/                 Admin + team area (role-aware)
  api/admin/orders.csv/  Orders / revenue CSV export
lib/
  db/                    Connection, withUser (RLS), generated schema, domain types
  better-auth.ts         Sign-in config, invite / set-password links
  auth.ts                requireProfile / requireStaff / authorize helpers
  storage.ts             Vercel Blob: signed URLs, reads, deletes
  payments.ts            Payment confirmation, subscription activation, invoices
  renewals.ts            Renewal orders, saved-card charges, billing cycle
  invoice-pdf.ts         Invoice PDF rendering
  packages.ts            Public package list for the landing page
  content.ts             Preview URLs + file naming for content
  brand-brief.ts         Brief fields + server-side sanitising
  notifications/         Email (Resend) + SMS (Termii) templates and dispatch
  affiliates.ts          Referral attribution, discounts, commissions
  assistant.ts           AI assistant prompt + Groq streaming
  reminders.ts           Onboarding / renewal reminders (daily cron)
  paystack.ts            Paystack API calls (server-only)
  activity.ts            Audit log writer (server-only)
  admin/                 Dashboard metrics, order filters, search helpers
db/
  migrations/            Schema, in order (plain SQL)
  seed.sql               Packages
scripts/                 migrate, make-admin, grant-plan, schema generation
docs/
  LAUNCH.md              Go-live checklist
```

## Build status

| Phase | Scope | Status |
| ----- | ----- | ------ |
| 1 | Foundations: build/lint, security fixes, auth redirects | ✅ |
| 2 | Data model v2: roles, orders, invoices, content batches, storage, settings, affiliates | ✅ |
| 3 | Payments: Paystack webhook, recurring billing, invoice PDFs, data-driven packages | ✅ |
| 4 | Client portal: content downloads, brand brief + logo upload | ✅ |
| 5 | Admin dashboard, then team portal | ✅ |
| 6 | Notifications (email/SMS), affiliates UI, AI assistant | ✅ |
| 7 | Go-live: health check, launch checklist | ✅ |
| 8 | Neon + Better Auth + Vercel Blob; free plans; legal pages; landing visuals; CI | ✅ |

---

Built and maintained by **Twin Kreative Limited** · [twinkreative.co](https://twinkreative.co)
