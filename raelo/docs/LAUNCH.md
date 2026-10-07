# Going live

A checklist for launching Raelo as a standalone site.

## 1. Set up the services

- [ ] **Supabase** (production project): run every file in
      `supabase/migrations/` in order, then `supabase/seed.sql`.
- [ ] **Supabase Auth → URL configuration:** Site URL = your domain; add
      `<site>/auth/confirm` to the redirect URLs. Set up custom SMTP (Resend
      works) so sign-up, invite and reset emails come from your domain.
- [ ] **Google sign-in:** create a Google OAuth client and enable the Google
      provider in Supabase (steps in README → Sign in with Google). Publish
      the OAuth consent screen so it isn't limited to test users.
- [ ] **Hosting** (e.g. Vercel): deploy and set every variable in
      `.env.example`:
  - `NEXT_PUBLIC_SITE_URL`: your domain
  - `PAYSTACK_SECRET_KEY`: start with the **test** key (`sk_test_…`)
  - `CRON_SECRET`: `openssl rand -hex 32` (renewals and reminders need it)
  - `RESEND_API_KEY` (+ a verified sending domain), `EMAIL_FROM`
  - `TERMII_API_KEY`, `TERMII_BASE_URL` (from the Termii dashboard), and a
    registered sender ID
  - `GROQ_API_KEY` if you want the chat assistant
- [ ] **Paystack dashboard → Settings → API Keys & Webhooks:** webhook URL =
      `https://<domain>/api/webhooks/paystack`.
- [ ] **Cron:** Vercel picks up `vercel.json` automatically. On other hosts,
      call `GET /api/cron/billing` daily with
      `Authorization: Bearer $CRON_SECRET`.
- [ ] `GET https://<domain>/api/health` returns `"ok": true`.

## 2. Configure the app

- [ ] Sign up, then make yourself the first admin in the Supabase SQL editor:
      `update public.profiles set role = 'admin' where email = 'you@example.com';`
- [ ] **Admin → Settings:** Brand, Admin alerts, Email, SMS, Notifications,
      Affiliates, AI assistant.
- [ ] **Admin → Packages:** names, prices and "what's included".
- [ ] **Admin → Team:** invite designers and account managers.

## 3. Rehearse in test mode

- [ ] Buy a package with a Paystack test card; check the welcome email/SMS.
- [ ] Complete the brand brief (with a logo).
- [ ] As an admin, assign a designer and account manager to the client.
- [ ] As the designer, create a batch and upload files; as the account
      manager, publish it; as the client, download it (single file + zip).
- [ ] Apply as an affiliate, approve, buy through the `?ref=` link, check the
      discount and commission.
- [ ] Check **Admin → Activity log → Messages** for failed emails/SMS.

## 4. Go live

- [ ] Switch `PAYSTACK_SECRET_KEY` to the **live** key and redeploy.
- [ ] `/api/health` shows `"paystackMode": "live"`.
- [ ] Make one small real purchase, refund it in Paystack, then
      **Mark refunded** in Admin → Orders.
- [ ] Watch **Admin → Activity log** (Events + Messages) for the first days.
