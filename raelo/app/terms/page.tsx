import type { Metadata } from "next";
import Link from "next/link";

import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Terms of service" };
export const revalidate = 3600;

export default async function TermsPage() {
  const email = await supportEmail();

  return (
    <LegalPage title="Terms of service">
      <p>
        These terms cover your use of Raelo (the website, client portal and content subscription), operated by
        Twin Kreative Limited, a company registered in Nigeria (&quot;we&quot;, &quot;us&quot;). By creating an
        account or subscribing you agree to them.
      </p>

      <h2>1. The service</h2>
      <p>
        Raelo is a monthly subscription for designed social media content. Each package lists what it includes
        (for example, the number of posts and platforms). We create content from the brand brief you give us and
        deliver it through your private client portal. We don&apos;t post to your accounts for you unless your
        package says so.
      </p>

      <h2>2. Your account</h2>
      <ul>
        <li>Give accurate details and keep your password private. You&apos;re responsible for activity on your account.</li>
        <li>You must be at least 18 and able to enter a contract for the business you subscribe for.</li>
        <li>We may suspend accounts used for fraud, abuse or anything unlawful.</li>
      </ul>

      <h2>3. Payments and renewals</h2>
      <ul>
        <li>Prices are in Naira and shown before you pay. Payments are processed by Paystack; we never see or store your full card number.</li>
        <li>
          Subscriptions renew automatically at the end of each billing period when you paid by card. You can turn
          auto-renew off at any time in <strong>Portal → Billing</strong>; your plan then runs until the end of the
          period you&apos;ve paid for. If you paid by bank transfer or USSD you renew manually.
        </li>
        <li>If a renewal payment fails we&apos;ll retry and let you know. Access ends a few days after the paid period if payment isn&apos;t made.</li>
        <li>We may change package prices. Changes apply from your next renewal, and we&apos;ll tell you before they do.</li>
        <li>Refunds are covered by our <Link href="/refunds">refund policy</Link>.</li>
      </ul>

      <h2>4. Your brand materials</h2>
      <p>
        You keep ownership of the logos, photos, names and other materials you give us, and you confirm you have
        the right to use them. You allow us to use them only to create your content.
      </p>

      <h2>5. Content we create for you</h2>
      <p>
        Once a period has been paid for, you may use the content delivered in it for your business, on any
        platform, without time limit. We may show non-confidential work in our portfolio unless you ask us not
        to. Some designs may use licensed fonts, stock images or icons; those stay subject to their own licences,
        which we&apos;ve taken care of for use in your posts.
      </p>

      <h2>6. Acceptable use</h2>
      <p>
        We won&apos;t create content that is unlawful, misleading, hateful, sexually explicit, or that infringes
        someone else&apos;s rights, and we may decline requests we consider harmful. You&apos;re responsible for
        what you publish and for following each platform&apos;s rules.
      </p>

      <h2>7. Affiliates</h2>
      <p>
        If you join our affiliate programme, the commission rate, discount and payout rules shown in your
        affiliate dashboard apply. Commissions on refunded orders are cancelled. You can&apos;t earn commission on
        your own purchases.
      </p>

      <h2>8. Liability</h2>
      <p>
        We work hard to deliver on time and to a high standard, but we can&apos;t guarantee particular results
        (such as follower growth or sales). To the extent the law allows, our total liability to you is limited to
        the amount you paid us in the three months before the claim, and we aren&apos;t liable for indirect losses.
        Nothing in these terms limits rights you have under Nigerian consumer protection law.
      </p>

      <h2>9. Ending the service</h2>
      <p>
        You can stop renewing at any time. We may end the service with 30 days&apos; notice, or immediately if
        these terms are seriously broken. Content already delivered and paid for stays yours to use.
      </p>

      <h2>10. Changes and law</h2>
      <p>
        We may update these terms; if a change is significant we&apos;ll tell you by email or in the portal. These
        terms are governed by the laws of the Federal Republic of Nigeria.
      </p>

      <h2>Contact</h2>
      <p>
        Questions? Email <a href={`mailto:${email}`}>{email}</a>.
      </p>
    </LegalPage>
  );
}
