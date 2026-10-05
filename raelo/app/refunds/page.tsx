import type { Metadata } from "next";

import { LegalPage, supportEmail } from "@/components/legal-page";

export const metadata: Metadata = { title: "Refund and cancellation policy" };
export const revalidate = 3600;

export default async function RefundsPage() {
  const email = await supportEmail();

  return (
    <LegalPage title="Refund and cancellation policy">
      <h2>Cancelling</h2>
      <p>
        You can cancel at any time by turning off auto-renew in <strong>Portal → Billing</strong>. You won&apos;t be
        charged again, and you keep access to your portal and any content delivered until the end of the period
        you&apos;ve already paid for.
      </p>

      <h2>Refunds</h2>
      <ul>
        <li>
          <strong>Before we start:</strong> if you ask within 7 days of paying and we haven&apos;t started work on
          that period&apos;s content, we&apos;ll refund the payment in full.
        </li>
        <li>
          <strong>After work has started:</strong> because each month&apos;s content is made specifically for your
          brand, payments for a period aren&apos;t refundable once work on it has begun. If something isn&apos;t
          right, we&apos;ll revise it.
        </li>
        <li>
          <strong>If we can&apos;t deliver:</strong> if we fail to deliver a paid period&apos;s content, you&apos;re
          entitled to a refund for the part we didn&apos;t deliver.
        </li>
        <li>
          <strong>Charged by mistake:</strong> duplicate charges or renewals taken after you turned auto-renew off
          are refunded in full.
        </li>
      </ul>

      <h2>How to ask</h2>
      <p>
        Email <a href={`mailto:${email}`}>{email}</a> with your order number (it&apos;s on your invoice in Portal →
        Billing). Approved refunds go back to the original payment method through Paystack, usually within 5–10
        working days depending on your bank.
      </p>

      <h2>Affiliate discounts and commissions</h2>
      <p>
        Refunds are made on the amount you actually paid, after any referral discount. Affiliate commission on a
        refunded order is cancelled.
      </p>
    </LegalPage>
  );
}
