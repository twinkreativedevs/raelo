import "server-only";

// Thin HTTP clients for the two delivery providers. Neither throws: they
// return { ok, id?, error? } so a failed message never breaks the flow that
// triggered it. Missing credentials => { ok: false, skipped: true }.

export interface SendResult {
  ok: boolean;
  skipped?: boolean;
  id?: string;
  error?: string;
}

export interface EmailMessage {
  to: string;
  subject: string;
  html: string;
  text: string;
  from: string;
  replyTo?: string;
}

/** Resend (https://resend.com). RESEND_API_URL is only for tests/proxies. */
export async function sendEmail(message: EmailMessage): Promise<SendResult> {
  const key = process.env.RESEND_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "RESEND_API_KEY not set" };

  try {
    const res = await fetch(`${process.env.RESEND_API_URL ?? "https://api.resend.com"}/emails`, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        from: message.from,
        to: [message.to],
        subject: message.subject,
        html: message.html,
        text: message.text,
        ...(message.replyTo ? { reply_to: message.replyTo } : {}),
      }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return res.ok ? { ok: true, id: json.id } : { ok: false, error: json.message ?? `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }
}

/**
 * Nigerian numbers to Termii's international format without "+":
 * 0803 123 4567 / +234 803 123 4567 / 2348031234567 -> 2348031234567.
 * Returns null if it doesn't look like a phone number.
 */
export function normalizePhone(raw: string | null | undefined) {
  if (!raw) return null;
  const digits = raw.replace(/[^\d]/g, "");
  if (/^0\d{10}$/.test(digits)) return `234${digits.slice(1)}`;
  if (/^234\d{10}$/.test(digits)) return digits;
  if (/^\d{11,15}$/.test(digits) && raw.trim().startsWith("+")) return digits;
  return null;
}

/**
 * Termii (https://termii.com). Each Termii account has its own base URL
 * (shown on the dashboard), hence TERMII_BASE_URL.
 */
export async function sendSms(to: string, text: string, senderId: string): Promise<SendResult> {
  const key = process.env.TERMII_API_KEY;
  if (!key) return { ok: false, skipped: true, error: "TERMII_API_KEY not set" };

  const phone = normalizePhone(to);
  if (!phone) return { ok: false, error: "invalid phone number" };

  try {
    const res = await fetch(`${process.env.TERMII_BASE_URL ?? "https://api.ng.termii.com"}/api/sms/send`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        api_key: key,
        to: phone,
        from: senderId,
        sms: text,
        type: "plain",
        channel: "generic",
      }),
      cache: "no-store",
    });
    const json = await res.json().catch(() => ({}));
    return res.ok && (json.code === "ok" || json.message_id)
      ? { ok: true, id: json.message_id }
      : { ok: false, error: json.message ?? `HTTP ${res.status}` };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : "network error" };
  }
}
