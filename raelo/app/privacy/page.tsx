import type { Metadata } from "next";

import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Privacy policy" };
export const revalidate = 3600;

export default async function PrivacyPage() {
  const email = await supportEmail();

  return (
    <LegalPage title="Privacy policy">
      <p>
        This policy explains what personal data Raelo collects, why, and your rights. Raelo is operated by Twin
        Kreative Limited (&quot;we&quot;), the data controller, in line with the Nigeria Data Protection Act 2023.
      </p>

      <h2>What we collect</h2>
      <ul>
        <li><strong>Account details:</strong> your name, email, phone number, company name and password (stored only as a secure hash).</li>
        <li><strong>Brand brief:</strong> your business details, audience, brand voice, colours, social handles, logo and any links you share.</li>
        <li><strong>Payments:</strong> order amounts and references. Card payments are handled by Paystack. We keep only a card&apos;s brand, last four digits and a Paystack token used for renewals, never the full card number.</li>
        <li><strong>Affiliate details:</strong> if you join the affiliate programme, your referral code and the bank details you give us for payouts.</li>
        <li><strong>Usage and security:</strong> sign-in sessions (IP address and browser), an audit log of account actions, and a record of emails and text messages we send you.</li>
        <li><strong>Chat assistant:</strong> messages you type into the website assistant are sent to our AI provider to generate a reply. We don&apos;t store these conversations.</li>
      </ul>

      <h2>Why we use it</h2>
      <ul>
        <li>To provide the service you subscribed to: creating and delivering your content (contract).</li>
        <li>To take payments, issue invoices and run renewals (contract and legal obligation).</li>
        <li>To send service messages: receipts, reminders, &quot;your content is ready&quot; (contract).</li>
        <li>To keep accounts secure and prevent fraud (legitimate interest).</li>
        <li>We don&apos;t sell your data or use it for third-party advertising.</li>
      </ul>

      <h2>Who we share it with</h2>
      <p>Only the providers that run Raelo for us, each bound to protect your data:</p>
      <ul>
        <li>Paystack (payments)</li>
        <li>Neon (database hosting) and Vercel (website hosting and file storage)</li>
        <li>Resend (email) and Termii (SMS)</li>
        <li>Groq (the website chat assistant)</li>
      </ul>
      <p>
        Some of these providers process data outside Nigeria. Where they do, we rely on their contractual and
        security safeguards as required by the Nigeria Data Protection Act. We may also disclose data where the
        law requires it.
      </p>

      <h2>How long we keep it</h2>
      <p>
        We keep your account and brand brief while you&apos;re a client and for up to two years after your last
        subscription ends, unless you ask us to delete it sooner. Invoices and payment records are kept for six
        years for tax and accounting purposes.
      </p>

      <h2>Your rights</h2>
      <p>
        You can ask to access, correct, download or delete your personal data, object to or restrict how we use
        it, or withdraw consent where we rely on it. You can update most details yourself in the portal. For
        anything else, email <a href={`mailto:${email}`}>{email}</a>; we&apos;ll reply within 30 days. You can
        also complain to the Nigeria Data Protection Commission.
      </p>

      <h2>Cookies</h2>
      <p>
        We use essential cookies to keep you signed in and, if you arrive through an affiliate link, to remember
        the referral for up to the period shown in our affiliate terms. We don&apos;t use advertising cookies.
      </p>

      <h2>Security</h2>
      <p>
        Data is encrypted in transit, files are kept in private storage and shared only through short-lived links,
        and access inside our team is limited to the people working on your account.
      </p>

      <h2>Changes</h2>
      <p>We&apos;ll post any changes here and tell you by email if they&apos;re significant.</p>
    </LegalPage>
  );
}
