# Raelo

**Built by Twin Kreative**

Raelo is a done-for-you social media content subscription. Clients pick a
monthly package, pay with Paystack, complete a brand brief, and download
professionally designed content from a private portal.

A standalone web app: marketing site, checkout, client portal, team
workspace and admin, all in one Next.js project backed by Supabase.

## Stack

- [Next.js 16](https://nextjs.org) (App Router, server actions, `proxy.ts`)
- [Supabase](https://supabase.com): Postgres, Auth, Storage, Row Level Security
- Tailwind CSS + shadcn/ui
- Paystack for payments
- TypeScript

## Getting started

1. Create a Supabase project.
2. Copy `.env.example` to `.env.local` and fill in every value.
3. Apply the database schema. Run each file in `supabase/migrations/` **in
   order** in the Supabase SQL editor (or `supabase db push` if you use the
   CLI), then run `supabase/seed.sql`.
4. Install and run:

   ```bash
   npm install
   npm run dev
   ```

5. Sign up through the app, then make yourself the first admin in the SQL
   editor (after that, invite everyone else from **Admin → Team**):

   ```sql
   update public.profiles set role = 'admin' where email = 'you@example.com';
   ```

### Supabase Auth settings

- **Authentication → URL Configuration**: set the Site URL to your
  `NEXT_PUBLIC_SITE_URL` and add `<site>/auth/confirm` to the redirect URLs.
- Email links land on `/auth/confirm`, which supports both the default
  (`?code=`) and custom (`?token_hash=&type=`) template styles.

### Sign in with Google

The login and sign-up pages have a "Continue with Google" button. Google
accounts are created on first use, with the name copied from Google; they
have no phone number until the client adds one under Account.

1. In [Google Cloud Console](https://console.cloud.google.com/apis/credentials)
   configure the OAuth consent screen, then create an **OAuth client ID**
   (type: Web application).
2. Under **Authorized redirect URIs** add
   `https://<project-ref>.supabase.co/auth/v1/callback` (shown in Supabase
   under **Authentication → Sign In / Providers → Google**).
3. In that Supabase Google provider screen, enable Google and paste the
   client ID and secret.
4. Make sure `<site>/auth/confirm` is in the Supabase redirect URLs (above);
   Google sign-in returns there.

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
(`TERMII_API_KEY`, `TERMII_BASE_URL`, sender ID in Settings). Each event can be
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

| Command         | What it does            |
| --------------- | ----------------------- |
| `npm run dev`   | Dev server on :3000     |
| `npm run build` | Production build        |
| `npm run lint`  | ESLint                  |

## Access model

Every table has Row Level Security. In short:

| Role              | Can see                                                        |
| ----------------- | -------------------------------------------------------------- |
| `client`          | Their own profile, subscriptions, orders, invoices, brief, and **published** content |
| `designer`        | Clients/subscriptions they're assigned to; can upload draft content |
| `account_manager` | Same as designer, and can publish content batches              |
| `admin`           | Everything                                                     |

Sensitive writes (activating subscriptions, orders, invoices, the audit log)
happen only in server code using the service-role key. See
`supabase/migrations/0007`–`0013` for the exact policies.

## Project layout

```
app/
  page.tsx               Landing page
  auth/                  Login, sign-up, password reset, email confirm
  checkout/[slug]/       Package page + pay button
  checkout/verify/       Paystack callback
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
  payments.ts            Payment confirmation, subscription activation, invoices
  renewals.ts            Renewal orders, saved-card charges, billing cycle
  invoice-pdf.ts         Invoice PDF rendering
  packages.ts            Public package list for the landing page
  content.ts             Signed URLs + file naming for the content bucket
  brand-brief.ts         Brief fields + server-side sanitising
  notifications/         Email (Resend) + SMS (Termii) templates and dispatch
  affiliates.ts          Referral attribution, discounts, commissions
  assistant.ts           AI assistant prompt + Groq streaming
  reminders.ts           Onboarding / renewal reminders (daily cron)
  paystack.ts            Paystack API calls (server-only)
  activity.ts            Audit log writer (server-only)
  auth.ts                requireProfile / requireStaff / authorize helpers
  admin/                 Dashboard metrics, order filters, search helpers
  supabase/              Browser, server, service-role clients + types
supabase/
  migrations/            Schema, in order
  seed.sql               Packages
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

---

Built and maintained by **Twin Kreative Limited** · [twinkreative.co](https://twinkreative.co)
