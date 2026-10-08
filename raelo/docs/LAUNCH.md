# Going live

Two stages: first get the site running so you can use the admin area and
the client portal (no payments or email needed), then connect the rest and
switch on payments.

## Stage 1: run the site and get into the dashboards

### 1. Database (Neon)

- [ ] Create a project at [console.neon.tech](https://console.neon.tech)
      (region: closest to your users, e.g. AWS Frankfurt or London for Nigeria).
- [ ] **Connect** → copy the **pooled** connection string (host contains
      `-pooler`).
- [ ] On your computer, in the `raelo/` folder: copy `.env.example` to
      `.env.local`, set `DATABASE_URL`, then run `npm install` and
      `npm run db:migrate`. This creates every table and the packages.

### 2. Hosting (Vercel)

- [ ] Import the GitHub repo in Vercel, **Root Directory: `raelo`**.
- [ ] Environment variables (Settings → Environment Variables):
  - `DATABASE_URL`: the pooled Neon string
  - `BETTER_AUTH_SECRET`: `openssl rand -base64 32`
  - `NEXT_PUBLIC_SITE_URL`: your domain, e.g. `https://raelo.ng` (no trailing slash)
  - `CRON_SECRET`: `openssl rand -hex 32`
- [ ] **Storage → Create → Blob**, access **Private**, connect it to the
      project (adds `BLOB_READ_WRITE_TOKEN`). Needed for logo and content
      uploads.
- [ ] Deploy, then add your domain (Settings → Domains).
- [ ] `https://<domain>/api/health` returns `"ok": true`.

### 3. Get access

- [ ] Sign up at `https://<domain>/auth/sign-up` with your own email.
- [ ] Make yourself admin. Either from your computer (with `.env.local`
      pointing at the same database): `npm run make-admin -- you@example.com`,
      or in the Neon console → SQL Editor:
      `update profiles set role = 'admin' where email = 'you@example.com';`
- [ ] Sign out, then sign in at `https://<domain>/compass` → you land on
      `/admin`.
- [ ] To see the **client portal**, sign up a second account (e.g.
      `you+client@example.com`), then in **Admin → Clients → that client →
      Give free plan**. Sign in as that account: the portal shows the plan,
      the brand brief and delivered content.
- [ ] **Admin → Settings:** Brand (support email shows on the legal pages),
      Admin alerts, Notifications, Affiliates, AI assistant.
- [ ] **Admin → Packages:** names, prices and "what's included".
- [ ] **Admin → Team:** invite designers and account managers. Until email
      is connected, the invite link is shown on screen for you to send.

Until Paystack is connected, package pages say "online payment opens soon"
and nobody can be charged. Use **Give free plan** for anyone who should
have access.

## Stage 2: connect services and take payments

### 4. Email and SMS

- [ ] **Resend:** verify your sending domain, then set `RESEND_API_KEY` and
      `EMAIL_FROM` (or the sender in Admin → Settings → Email). From then on
      new sign-ups must confirm their email, and invites and password resets
      are emailed.
- [ ] **Termii:** register a sender ID (approval can take several days, so
      start early), then set `TERMII_API_KEY` and `TERMII_BASE_URL`, and the
      sender ID in Admin → Settings → SMS.
- [ ] Optional: `GROQ_API_KEY` for the chat assistant, then enable it in
      Admin → Settings → AI assistant.

### Optional: Sign in with Google

- [ ] Create a Google OAuth client (steps in README → Sign in with Google)
      with redirect URI `https://<domain>/api/auth/callback/google`.
- [ ] Set `GOOGLE_CLIENT_ID` and `GOOGLE_CLIENT_SECRET` in Vercel and
      redeploy; the button appears on the login and sign-up pages.
- [ ] **Publish** the OAuth consent screen, otherwise only the test users
      you list in Google can sign in.

### 5. Legal pages

- [ ] Review `/terms`, `/privacy` and `/refunds` (in `app/terms`,
      `app/privacy`, `app/refunds`) with a lawyer, especially the refund
      window and liability cap. Paystack checks for these before activating
      a live account.

### 6. Paystack (test mode first)

- [ ] Set `PAYSTACK_SECRET_KEY` to the **test** key (`sk_test_…`) and redeploy.
- [ ] Paystack dashboard → **Settings → API Keys & Webhooks** → webhook URL
      `https://<domain>/api/webhooks/paystack`.
- [ ] `/api/health` shows `"paystackMode": "test"`.

### 7. Rehearse in test mode

- [ ] Buy a package with a Paystack test card; check the welcome email/SMS
      and the invoice in Portal → Billing.
- [ ] Complete the brand brief (with a logo).
- [ ] As an admin, assign a designer and account manager to the client.
- [ ] As the designer, create a batch and upload files; as the account
      manager, publish it; as the client, download it (single file + zip).
- [ ] Apply as an affiliate, approve, buy through the `?ref=` link, check the
      discount and commission.
- [ ] Turn auto-renew off and on in Portal → Billing.
- [ ] Check **Admin → Activity log → Messages** for failed emails/SMS.

### 8. Go live

- [ ] Paystack: complete business verification and activate live mode.
- [ ] Switch `PAYSTACK_SECRET_KEY` to the **live** key and redeploy.
- [ ] `/api/health` shows `"paystackMode": "live"`.
- [ ] Make one small real purchase, refund it in Paystack, then
      **Mark refunded** in Admin → Orders.
- [ ] Watch **Admin → Activity log** (Events + Messages) for the first days.
