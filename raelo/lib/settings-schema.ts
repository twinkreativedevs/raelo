// Editable settings and how each form field is cleaned. Shared by the
// settings page (labels) and the save action (sanitising). Unknown fields
// are dropped, so a tampered form can't add keys.

export const NOTIFICATION_EVENTS: { key: string; label: string; audience: string }[] = [
  { key: "order_paid", label: "Payment received / welcome", audience: "Client + admins" },
  { key: "onboarding_reminder", label: "Onboarding reminder", audience: "Client" },
  { key: "onboarding_completed", label: "Brand brief completed", audience: "Admins + assigned team" },
  { key: "content_published", label: "New content published", audience: "Client" },
  { key: "subscription_renewed", label: "Subscription renewed", audience: "Client" },
  { key: "subscription_expiring", label: "Renewal failed / expiring", audience: "Client" },
  { key: "affiliate_approved", label: "Affiliate approved", audience: "Affiliate" },
  { key: "commission_earned", label: "Commission earned", audience: "Affiliate" },
  { key: "payout_recorded", label: "Payout recorded", audience: "Affiliate" },
];

type Clean = (raw: FormData) => Record<string, unknown> | { error: string };

const str = (fd: FormData, key: string, max = 200) => String(fd.get(key) ?? "").trim().slice(0, max);
const list = (fd: FormData, key: string) =>
  str(fd, key, 2000)
    .split(/[\n,]+/)
    .map((s) => s.trim())
    .filter(Boolean)
    .slice(0, 10);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const int = (fd: FormData, key: string, min: number, max: number) => {
  const n = Number(str(fd, key, 10));
  return Number.isFinite(n) && n >= min && n <= max ? Math.round(n) : null;
};

export const SETTINGS_SCHEMA: Record<string, Clean> = {
  brand: (fd) => {
    const siteName = str(fd, "site_name", 60);
    if (!siteName) return { error: "Site name is required." };
    const supportEmail = str(fd, "support_email", 120);
    if (supportEmail && !EMAIL.test(supportEmail)) return { error: "Support email looks wrong." };
    return {
      site_name: siteName,
      tagline: str(fd, "tagline", 120),
      support_email: supportEmail,
      support_phone: str(fd, "support_phone", 30),
      primary_color: "#ed1c24",
      dark_color: "#080d16",
    };
  },
  admin_notifications: (fd) => {
    const emails = list(fd, "emails");
    if (emails.some((e) => !EMAIL.test(e))) return { error: "One of the emails looks wrong." };
    return { emails, phones: list(fd, "phones") };
  },
  notifications: (fd) =>
    Object.fromEntries(
      NOTIFICATION_EVENTS.map(({ key }) => [key, { email: fd.get(`${key}.email`) === "on", sms: fd.get(`${key}.sms`) === "on" }]),
    ),
  email: (fd) => {
    const from = str(fd, "from_address", 120);
    const replyTo = str(fd, "reply_to", 120);
    if ((from && !EMAIL.test(from)) || (replyTo && !EMAIL.test(replyTo))) return { error: "Check the email addresses." };
    return { from_name: str(fd, "from_name", 60), from_address: from, reply_to: replyTo, footer_text: str(fd, "footer_text", 300) };
  },
  sms: (fd) => {
    const senderId = str(fd, "sender_id", 11);
    if (!/^[A-Za-z0-9 ]{3,11}$/.test(senderId)) return { error: "Sender ID: 3–11 letters or numbers (Termii rule)." };
    return { sender_id: senderId };
  },
  ai_assistant: (fd) => {
    const model = str(fd, "model", 80);
    if (!/^[\w.\-/:]+$/.test(model)) return { error: "Enter a Groq model id, e.g. llama-3.3-70b-versatile." };
    return {
      enabled: fd.get("enabled") === "on",
      model,
      assistant_name: str(fd, "assistant_name", 60) || "Raelo Assistant",
      welcome_message: str(fd, "welcome_message", 300),
      system_prompt: str(fd, "system_prompt", 6000),
    };
  },
  affiliate: (fd) => {
    const threshold = int(fd, "unlock_threshold", 0, 10000);
    const discount = int(fd, "default_discount_percent", 0, 100);
    const commission = int(fd, "default_commission_percent", 0, 100);
    const cookieDays = int(fd, "cookie_days", 1, 365);
    if ([threshold, discount, commission, cookieDays].includes(null)) return { error: "Check the numbers." };
    return {
      unlock_threshold: threshold,
      default_discount_percent: discount,
      default_commission_percent: commission,
      cookie_days: cookieDays,
    };
  },
};
