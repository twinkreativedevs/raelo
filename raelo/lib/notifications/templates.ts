// Message content for each notification. Each template returns an email
// (subject + paragraphs + optional button) and an SMS (keep under 160 chars).
// All interpolated values are escaped when the email HTML is built.

import { formatDate, formatMoney } from "@/lib/format";

export interface Rendered {
  subject: string;
  heading: string;
  paragraphs: string[];
  cta?: { label: string; url: string };
  sms: string;
}

export interface TemplateContext {
  site: string;
  siteName: string;
  name?: string | null;
  [key: string]: unknown;
}

const hi = (name?: string | null) => (name ? `Hi ${name.split(" ")[0]},` : "Hi,");

export const TEMPLATES = {
  order_paid: (c: TemplateContext & { packageName: string; amount: number; orderNumber: string }): Rendered => ({
    subject: `Welcome to ${c.siteName} — let's set up your brand`,
    heading: "Payment received. Welcome aboard!",
    paragraphs: [
      hi(c.name),
      `Thanks for subscribing to ${c.packageName} (${formatMoney(c.amount, "NGN")}, order ${c.orderNumber}). Your invoice is in your account.`,
      "Next step: tell us about your brand so we can start creating. It takes about 5 minutes.",
    ],
    cta: { label: "Complete your brand brief", url: `${c.site}/onboarding` },
    sms: `${c.siteName}: payment received for ${c.packageName}. Complete your brand brief so we can start: ${c.site}/onboarding`,
  }),

  admin_new_order: (c: TemplateContext & { clientName: string; packageName: string; amount: number; orderNumber: string; kind: string }): Rendered => ({
    subject: `New ${c.kind === "renewal" ? "renewal" : "order"}: ${c.clientName} · ${c.packageName}`,
    heading: c.kind === "renewal" ? "Subscription renewed" : "New order",
    paragraphs: [`${c.clientName} paid ${formatMoney(c.amount, "NGN")} for ${c.packageName} (order ${c.orderNumber}).`],
    cta: { label: "Open orders", url: `${c.site}/admin/orders` },
    sms: `${c.siteName}: new ${c.kind === "renewal" ? "renewal" : "order"} ${c.orderNumber} from ${c.clientName}, ${formatMoney(c.amount, "NGN")}.`,
  }),

  subscription_renewed: (c: TemplateContext & { packageName: string; amount: number; expiresAt: string | null }): Rendered => ({
    subject: `Your ${c.siteName} subscription has renewed`,
    heading: "Subscription renewed",
    paragraphs: [
      hi(c.name),
      `We've charged ${formatMoney(c.amount, "NGN")} for another period of ${c.packageName}. You're covered until ${formatDate(c.expiresAt)}.`,
    ],
    cta: { label: "View invoice", url: `${c.site}/portal/billing` },
    sms: `${c.siteName}: your ${c.packageName} subscription renewed (${formatMoney(c.amount, "NGN")}). Paid until ${formatDate(c.expiresAt)}.`,
  }),

  subscription_expiring: (c: TemplateContext & { packageName: string; expiresAt: string | null; reason?: string }): Rendered => ({
    subject: `Action needed: we couldn't renew your ${c.siteName} subscription`,
    heading: "We couldn't renew your subscription",
    paragraphs: [
      hi(c.name),
      `We tried to renew ${c.packageName} but the payment didn't go through${c.reason ? ` (${c.reason})` : ""}.`,
      `Your content keeps coming until ${formatDate(c.expiresAt)}. Renew now to avoid a gap.`,
    ],
    cta: { label: "Renew now", url: `${c.site}/portal/billing` },
    sms: `${c.siteName}: we couldn't renew your ${c.packageName} subscription. Renew here to avoid a gap: ${c.site}/portal/billing`,
  }),

  renewal_due: (c: TemplateContext & { packageName: string; expiresAt: string | null }): Rendered => ({
    subject: `Your ${c.siteName} subscription ends on ${formatDate(c.expiresAt)}`,
    heading: "Time to renew",
    paragraphs: [
      hi(c.name),
      `Your ${c.packageName} subscription runs until ${formatDate(c.expiresAt)}. Renew now to keep your content coming without a gap.`,
      "Paying by card turns on automatic renewal, so you won't need to do this again.",
    ],
    cta: { label: "Renew now", url: `${c.site}/portal/billing` },
    sms: `${c.siteName}: your ${c.packageName} subscription ends ${formatDate(c.expiresAt)}. Renew to avoid a gap: ${c.site}/portal/billing`,
  }),

  onboarding_reminder: (c: TemplateContext): Rendered => ({
    subject: `Your brand brief is waiting`,
    heading: "We're ready when you are",
    paragraphs: [hi(c.name), "We can't start on your content until we know your brand. The brief takes about 5 minutes."],
    cta: { label: "Complete your brand brief", url: `${c.site}/onboarding` },
    sms: `${c.siteName}: we're ready to create your content! Please complete your brand brief: ${c.site}/onboarding`,
  }),

  onboarding_completed: (c: TemplateContext & { clientName: string; clientId: string }): Rendered => ({
    subject: `Brand brief completed: ${c.clientName}`,
    heading: "A brand brief is ready",
    paragraphs: [`${c.clientName} has completed their brand brief. Content production can start.`],
    cta: { label: "Open client", url: `${c.site}/admin/clients/${c.clientId}` },
    sms: `${c.siteName}: ${c.clientName} completed their brand brief.`,
  }),

  content_published: (c: TemplateContext & { batchTitle: string; batchId: string; count: number }): Rendered => ({
    subject: `New content is ready: ${c.batchTitle}`,
    heading: "Your new content is ready",
    paragraphs: [hi(c.name), `${c.count} file${c.count === 1 ? "" : "s"} in “${c.batchTitle}” ${c.count === 1 ? "is" : "are"} ready to download, with captions.`],
    cta: { label: "Download your content", url: `${c.site}/portal/content/${c.batchId}` },
    sms: `${c.siteName}: your new content "${c.batchTitle}" is ready to download: ${c.site}/portal/content/${c.batchId}`,
  }),

  affiliate_applied: (c: TemplateContext & { applicantName: string; code: string }): Rendered => ({
    subject: `New affiliate application: ${c.applicantName}`,
    heading: "New affiliate application",
    paragraphs: [`${c.applicantName} applied to the affiliate programme with the code “${c.code}”.`],
    cta: { label: "Review applications", url: `${c.site}/admin/affiliates?status=pending` },
    sms: `${c.siteName}: new affiliate application from ${c.applicantName}.`,
  }),

  affiliate_approved: (c: TemplateContext & { code: string; discount: number; commission: number }): Rendered => ({
    subject: `You're in! Welcome to the ${c.siteName} affiliate programme`,
    heading: "Your affiliate account is approved",
    paragraphs: [
      hi(c.name),
      `Share your link: ${c.site}/?ref=${c.code}`,
      `Your referrals get ${c.discount}% off their first payment and you earn ${c.commission}% of every sale you bring in.`,
    ],
    cta: { label: "Open your affiliate dashboard", url: `${c.site}/affiliate` },
    sms: `${c.siteName}: your affiliate account is approved! Your link: ${c.site}/?ref=${c.code}`,
  }),

  commission_earned: (c: TemplateContext & { amount: number; orderNumber: string }): Rendered => ({
    subject: `You earned a commission`,
    heading: `+${formatMoney(c.amount, "NGN")} commission`,
    paragraphs: [hi(c.name), `Someone you referred just subscribed (order ${c.orderNumber}). You earned ${formatMoney(c.amount, "NGN")}.`],
    cta: { label: "View your earnings", url: `${c.site}/affiliate` },
    sms: `${c.siteName}: you earned a ${formatMoney(c.amount, "NGN")} commission from a referral.`,
  }),

  payout_recorded: (c: TemplateContext & { amount: number; reference?: string | null }): Rendered => ({
    subject: `Payout sent: ${formatMoney(c.amount, "NGN")}`,
    heading: "Your payout is on its way",
    paragraphs: [hi(c.name), `We've paid out ${formatMoney(c.amount, "NGN")} in commissions${c.reference ? ` (reference ${c.reference})` : ""}.`],
    cta: { label: "View payouts", url: `${c.site}/affiliate` },
    sms: `${c.siteName}: we've sent your affiliate payout of ${formatMoney(c.amount, "NGN")}.`,
  }),
} as const;

export type TemplateName = keyof typeof TEMPLATES;

const escapeHtml = (s: string) =>
  s.replace(/[&<>"']/g, (ch) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch]!);

/** Branded, table-based HTML that renders in every mail client. */
export function toEmailHtml(r: Rendered, siteName: string, footer: string) {
  const paragraphs = r.paragraphs
    .map((p) => `<p style="margin:0 0 16px;font-size:15px;line-height:1.6;color:#374151">${escapeHtml(p)}</p>`)
    .join("");
  const button = r.cta
    ? `<p style="margin:24px 0"><a href="${escapeHtml(r.cta.url)}" style="display:inline-block;background:#ed1c24;color:#ffffff;text-decoration:none;font-weight:700;font-size:15px;padding:12px 22px;border-radius:999px">${escapeHtml(r.cta.label)}</a></p>`
    : "";
  return `<!doctype html><html><body style="margin:0;background:#f4f4f5;font-family:Helvetica,Arial,sans-serif">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#f4f4f5;padding:24px 12px"><tr><td align="center">
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="max-width:560px;background:#ffffff;border-radius:16px;overflow:hidden">
<tr><td style="background:#080d16;padding:18px 28px"><span style="display:inline-block;background:#ed1c24;color:#fff;font-weight:900;width:28px;height:28px;line-height:28px;text-align:center;border-radius:6px">R</span>
<span style="color:#fff;font-weight:700;font-size:18px;margin-left:8px;vertical-align:middle">${escapeHtml(siteName)}</span></td></tr>
<tr><td style="padding:28px">
<h1 style="margin:0 0 20px;font-size:22px;color:#111827">${escapeHtml(r.heading)}</h1>
${paragraphs}${button}
</td></tr>
<tr><td style="padding:18px 28px;border-top:1px solid #eee;font-size:12px;color:#9ca3af">${escapeHtml(footer)}</td></tr>
</table></td></tr></table></body></html>`;
}

export function toEmailText(r: Rendered, footer: string) {
  return [r.heading, "", ...r.paragraphs, ...(r.cta ? ["", `${r.cta.label}: ${r.cta.url}`] : []), "", "—", footer].join("\n");
}
