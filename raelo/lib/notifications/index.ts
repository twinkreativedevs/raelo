import "server-only";

import { after } from "next/server";

import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail, sendSms } from "./providers";
import { TEMPLATES, toEmailHtml, toEmailText, type TemplateName } from "./templates";

// Central notification dispatch. Every send:
//   1. checks the per-event email/SMS toggles in settings.notifications
//      (events without a toggle, like admin alerts, follow their parent's);
//   2. renders the template once per recipient;
//   3. logs the attempt in notification_log (sent / failed / skipped).
// Nothing here throws: a provider outage must never break a payment or a
// publish. Call sites wrap it in afterResponse() so it runs after the
// response is sent.

export type NotificationEvent =
  | "order_paid"
  | "subscription_renewed"
  | "subscription_expiring"
  | "onboarding_reminder"
  | "onboarding_completed"
  | "content_published"
  | "affiliate_applied"
  | "affiliate_approved"
  | "commission_earned"
  | "payout_recorded";

interface Recipient {
  userId?: string | null;
  name?: string | null;
  email?: string | null;
  phone?: string | null;
}

interface Channels {
  email: boolean;
  sms: boolean;
}

interface Config {
  toggles: Record<string, Partial<Channels>>;
  siteName: string;
  site: string;
  from: string | null;
  replyTo?: string;
  footer: string;
  senderId: string;
  adminEmails: string[];
  adminPhones: string[];
}

async function loadConfig(): Promise<Config> {
  const { data } = await createAdminClient()
    .from("settings")
    .select("key, value")
    .in("key", ["notifications", "email", "sms", "brand", "admin_notifications"]);
  const get = (key: string) => (data?.find((row) => row.key === key)?.value ?? {}) as Record<string, unknown>;

  const brand = get("brand");
  const email = get("email");
  const siteName = String(brand.site_name || "Raelo");
  const fromAddress = String(email.from_address || process.env.EMAIL_FROM || "");
  const fromName = String(email.from_name || siteName);

  return {
    toggles: get("notifications") as Record<string, Partial<Channels>>,
    siteName,
    site: (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, ""),
    from: fromAddress ? `${fromName} <${fromAddress}>` : null,
    replyTo: String(email.reply_to || "") || undefined,
    footer: String(email.footer_text || `${siteName} by Twin Kreative Limited`),
    senderId: String((get("sms").sender_id as string) || "Raelo"),
    adminEmails: (get("admin_notifications").emails as string[]) ?? [],
    adminPhones: (get("admin_notifications").phones as string[]) ?? [],
  };
}

async function alreadySent(dedupeKey: string, withinHours: number) {
  const since = new Date(Date.now() - withinHours * 3600_000).toISOString();
  const { count } = await createAdminClient()
    .from("notification_log")
    .select("id", { count: "exact", head: true })
    .eq("dedupe_key", dedupeKey)
    .eq("status", "sent")
    .gte("created_at", since);
  return (count ?? 0) > 0;
}

async function deliver(opts: {
  event: NotificationEvent;
  template: TemplateName;
  data: Record<string, unknown>;
  recipients: Recipient[];
  channels: Channels;
  config: Config;
  dedupeKey?: string;
}) {
  const { config } = opts;
  const log: Record<string, unknown>[] = [];
  const render = TEMPLATES[opts.template] as (c: Record<string, unknown>) => ReturnType<(typeof TEMPLATES)["onboarding_reminder"]>;

  for (const recipient of opts.recipients) {
    const rendered = render({ ...opts.data, site: config.site, siteName: config.siteName, name: recipient.name });
    const base = { event: opts.event, user_id: recipient.userId ?? null, dedupe_key: opts.dedupeKey ?? null };

    if (opts.channels.email && recipient.email) {
      const result = config.from
        ? await sendEmail({
            to: recipient.email,
            from: config.from,
            replyTo: config.replyTo,
            subject: rendered.subject,
            html: toEmailHtml(rendered, config.siteName, config.footer),
            text: toEmailText(rendered, config.footer),
          })
        : { ok: false, skipped: true, error: "no sender address configured" };
      log.push({ ...base, channel: "email", recipient: recipient.email, status: result.ok ? "sent" : result.skipped ? "skipped" : "failed", provider_id: result.id ?? null, error: result.error ?? null });
    }

    if (opts.channels.sms && recipient.phone) {
      const result = await sendSms(recipient.phone, rendered.sms, config.senderId);
      log.push({ ...base, channel: "sms", recipient: recipient.phone, status: result.ok ? "sent" : result.skipped ? "skipped" : "failed", provider_id: result.id ?? null, error: result.error ?? null });
    }
  }

  if (log.length) {
    const { error } = await createAdminClient().from("notification_log").insert(log);
    if (error) console.error("notification_log insert failed", error.message);
  }
}

function channelsFor(config: Config, event: NotificationEvent): Channels {
  const toggle = config.toggles[event] ?? {};
  return { email: toggle.email !== false, sms: toggle.sms === true };
}

/** Message to one user (client, affiliate or team member) by profile id. */
export async function notifyUser(
  event: NotificationEvent,
  userId: string,
  data: Record<string, unknown> = {},
  opts: { template?: TemplateName; dedupeKey?: string; dedupeHours?: number } = {},
) {
  try {
    const config = await loadConfig();
    const channels = channelsFor(config, event);
    if (!channels.email && !channels.sms) return;
    if (opts.dedupeKey && (await alreadySent(opts.dedupeKey, opts.dedupeHours ?? 72))) return;

    const { data: profile } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, email, phone")
      .eq("id", userId)
      .maybeSingle();
    if (!profile) return;

    await deliver({
      event,
      template: opts.template ?? (event as TemplateName),
      data,
      recipients: [{ userId: profile.id, name: profile.full_name, email: profile.email, phone: profile.phone }],
      channels,
      config,
      dedupeKey: opts.dedupeKey,
    });
  } catch (error) {
    console.error("notifyUser failed", event, error);
  }
}

/** Alert to the admin emails/phones in settings.admin_notifications. */
export async function notifyAdmins(
  event: NotificationEvent,
  template: TemplateName,
  data: Record<string, unknown> = {},
) {
  try {
    const config = await loadConfig();
    const channels = event === "affiliate_applied" ? { email: true, sms: false } : channelsFor(config, event);
    const recipients: Recipient[] = [
      ...(channels.email ? config.adminEmails.map((email) => ({ email })) : []),
      ...(channels.sms ? config.adminPhones.map((phone) => ({ phone })) : []),
    ];
    if (!recipients.length) return;
    await deliver({ event, template, data, recipients, channels, config });
  } catch (error) {
    console.error("notifyAdmins failed", event, error);
  }
}

/** Email to specific team members (e.g. those assigned to a client). */
export async function notifyStaff(
  event: NotificationEvent,
  profileIds: string[],
  template: TemplateName,
  data: Record<string, unknown> = {},
) {
  try {
    if (!profileIds.length) return;
    const config = await loadConfig();
    const channels = { email: channelsFor(config, event).email, sms: false };
    if (!channels.email) return;
    const { data: staff } = await createAdminClient()
      .from("profiles")
      .select("id, full_name, email")
      .in("id", profileIds)
      .eq("is_active", true);
    await deliver({
      event,
      template,
      data,
      recipients: (staff ?? []).map((s) => ({ userId: s.id, name: s.full_name, email: s.email })),
      channels,
      config,
    });
  } catch (error) {
    console.error("notifyStaff failed", event, error);
  }
}

/**
 * Runs `task` after the response is sent (Next.js `after`), so customers
 * never wait on email/SMS providers. Outside a request (scripts, tests) it
 * runs immediately instead.
 */
export async function afterResponse(task: () => Promise<unknown>) {
  try {
    after(task);
  } catch {
    await task();
  }
}
