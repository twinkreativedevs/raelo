import Link from "next/link";

import { requireStaff } from "@/lib/auth";
import { NOTIFICATION_EVENTS } from "@/lib/settings-schema";
import { cn } from "@/lib/utils";
import { SettingsForm } from "@/components/admin/settings-form";
import { AdminPageHeader, Panel, inputClass } from "@/components/admin/ui";

export const metadata = { title: "Settings" };

const TABS = [
  { key: "brand", label: "Brand" },
  { key: "admin_notifications", label: "Admin alerts" },
  { key: "notifications", label: "Notifications" },
  { key: "email", label: "Email" },
  { key: "sms", label: "SMS (Termii)" },
  { key: "affiliate", label: "Affiliates" },
  { key: "ai_assistant", label: "AI assistant" },
  { key: "payments", label: "Payments" },
] as const;

type Values = Record<string, unknown>;

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="grid gap-1 text-sm font-semibold">
      {label}
      {children}
      {hint && <span className="text-xs font-normal text-black/50">{hint}</span>}
    </label>
  );
}

const text = (v: Values, k: string) => (typeof v[k] === "string" || typeof v[k] === "number" ? String(v[k]) : "");

export default async function SettingsPage({ searchParams }: { searchParams: Promise<{ tab?: string }> }) {
  const { supabase } = await requireStaff("/admin/settings", ["admin"]);
  const requested = (await searchParams).tab;
  const tab = TABS.find((t) => t.key === requested)?.key ?? "brand";

  const { data: rows } = await supabase.from("settings").select("key, value, updated_at");
  const values = (key: string) => (rows?.find((r) => r.key === key)?.value ?? {}) as Values;
  const v = values(tab);

  const secret = process.env.PAYSTACK_SECRET_KEY ?? "";
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "") || "https://<your-site>";

  return (
    <>
      <AdminPageHeader title="Settings" />
      <div className="flex flex-wrap gap-1 text-sm font-semibold">
        {TABS.map((t) => (
          <Link key={t.key} href={`/admin/settings?tab=${t.key}`} className={cn("rounded-lg px-3 py-1.5", t.key === tab ? "bg-[#111827] text-white" : "bg-white text-black/60 hover:text-black")}>
            {t.label}
          </Link>
        ))}
      </div>

      <Panel>
        {tab === "brand" && (
          <SettingsForm settingKey="brand">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Site name"><input name="site_name" required defaultValue={text(v, "site_name")} className={inputClass} /></Field>
              <Field label="Tagline" hint="Shown on invoices"><input name="tagline" defaultValue={text(v, "tagline")} className={inputClass} /></Field>
              <Field label="Support email" hint="Shown on invoices and emails"><input name="support_email" type="email" defaultValue={text(v, "support_email")} className={inputClass} /></Field>
              <Field label="Support phone"><input name="support_phone" defaultValue={text(v, "support_phone")} className={inputClass} /></Field>
            </div>
            <p className="text-xs text-black/50">Brand colours are fixed in the design (red #ed1c24, dark #080d16).</p>
          </SettingsForm>
        )}

        {tab === "admin_notifications" && (
          <SettingsForm settingKey="admin_notifications">
            <Field label="Admin emails" hint="One per line. They get new-order, onboarding and affiliate-application alerts.">
              <textarea name="emails" rows={3} defaultValue={((v.emails as string[]) ?? []).join("\n")} className={`${inputClass} h-auto py-2`} />
            </Field>
            <Field label="Admin phone numbers" hint="One per line, for SMS alerts.">
              <textarea name="phones" rows={2} defaultValue={((v.phones as string[]) ?? []).join("\n")} className={`${inputClass} h-auto py-2`} />
            </Field>
          </SettingsForm>
        )}

        {tab === "notifications" && (
          <SettingsForm settingKey="notifications">
            <p className="text-sm text-black/60">Which messages go out, per channel. Email is sent with Resend (RESEND_API_KEY), SMS with Termii (TERMII_API_KEY). Every attempt is listed under Activity log → Messages.</p>
            <table className="w-full text-sm">
              <thead><tr className="text-left text-xs uppercase tracking-wider text-black/40"><th className="py-2">Event</th><th>Goes to</th><th className="text-center">Email</th><th className="text-center">SMS</th></tr></thead>
              <tbody>
                {NOTIFICATION_EVENTS.map((e) => {
                  const current = (v[e.key] ?? {}) as { email?: boolean; sms?: boolean };
                  return (
                    <tr key={e.key} className="border-t border-black/5">
                      <td className="py-2 font-semibold">{e.label}</td>
                      <td className="text-black/60">{e.audience}</td>
                      <td className="text-center"><input type="checkbox" name={`${e.key}.email`} defaultChecked={current.email} aria-label={`${e.label} email`} /></td>
                      <td className="text-center"><input type="checkbox" name={`${e.key}.sms`} defaultChecked={current.sms} aria-label={`${e.label} SMS`} /></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </SettingsForm>
        )}

        {tab === "email" && (
          <SettingsForm settingKey="email">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="From name"><input name="from_name" defaultValue={text(v, "from_name")} className={inputClass} /></Field>
              <Field label="From address" hint="Must be a verified sender with your email provider"><input name="from_address" type="email" defaultValue={text(v, "from_address")} className={inputClass} /></Field>
              <Field label="Reply-to"><input name="reply_to" type="email" defaultValue={text(v, "reply_to")} className={inputClass} /></Field>
              <Field label="Footer text" hint="Also printed on invoices"><input name="footer_text" defaultValue={text(v, "footer_text")} className={inputClass} /></Field>
            </div>
          </SettingsForm>
        )}

        {tab === "sms" && (
          <SettingsForm settingKey="sms">
            <Field label="Sender ID" hint="3–11 characters, registered with Termii. The API key is the TERMII_API_KEY environment variable.">
              <input name="sender_id" defaultValue={text(v, "sender_id")} maxLength={11} className={inputClass} />
            </Field>
          </SettingsForm>
        )}

        {tab === "affiliate" && (
          <SettingsForm settingKey="affiliate">
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Sales to unlock commissions" hint="Commissions become withdrawable after this many confirmed sales"><input name="unlock_threshold" type="number" min={0} defaultValue={text(v, "unlock_threshold")} className={inputClass} /></Field>
              <Field label="Referral cookie (days)"><input name="cookie_days" type="number" min={1} max={365} defaultValue={text(v, "cookie_days")} className={inputClass} /></Field>
              <Field label="Default customer discount (%)" hint="For newly approved affiliates"><input name="default_discount_percent" type="number" min={0} max={100} defaultValue={text(v, "default_discount_percent")} className={inputClass} /></Field>
              <Field label="Default commission (%)"><input name="default_commission_percent" type="number" min={0} max={100} defaultValue={text(v, "default_commission_percent")} className={inputClass} /></Field>
            </div>
          </SettingsForm>
        )}

        {tab === "ai_assistant" && (
          <SettingsForm settingKey="ai_assistant">
            {!process.env.GROQ_API_KEY && (
              <p className="rounded-lg bg-amber-50 px-3 py-2 text-sm text-amber-800">GROQ_API_KEY isn&apos;t set, so the widget stays hidden. Get a key at console.groq.com and add it to your environment variables.</p>
            )}
            <label className="flex items-center gap-2 text-sm font-semibold"><input type="checkbox" name="enabled" defaultChecked={v.enabled === true} /> Show the chat widget on the landing page</label>
            <div className="grid gap-4 md:grid-cols-2">
              <Field label="Model" hint="Groq model ids change without notice. If the assistant stops replying, check console.groq.com/docs/models."><input name="model" required defaultValue={text(v, "model") || "llama-3.3-70b-versatile"} className={inputClass} /></Field>
              <Field label="Assistant name"><input name="assistant_name" defaultValue={text(v, "assistant_name")} className={inputClass} /></Field>
            </div>
            <Field label="Welcome message"><input name="welcome_message" defaultValue={text(v, "welcome_message")} className={inputClass} /></Field>
            <Field label="Extra knowledge & tone" hint="Packages and prices are included automatically. Add FAQs, turnaround times, refund policy, tone of voice…">
              <textarea name="system_prompt" rows={8} defaultValue={text(v, "system_prompt")} className={`${inputClass} h-auto py-2`} />
            </Field>
          </SettingsForm>
        )}

        {tab === "payments" && (
          <dl className="grid gap-3 text-sm">
            <div className="grid gap-1 sm:grid-cols-[200px_1fr]">
              <dt className="text-black/50">Paystack mode</dt>
              <dd className="font-semibold">{secret.startsWith("sk_live_") ? "Live" : secret.startsWith("sk_test_") ? "Test" : "Not configured"}</dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[200px_1fr]">
              <dt className="text-black/50">Webhook URL</dt>
              <dd><code className="rounded bg-black/5 px-2 py-1">{site}/api/webhooks/paystack</code></dd>
            </div>
            <div className="grid gap-1 sm:grid-cols-[200px_1fr]">
              <dt className="text-black/50">Renewals cron</dt>
              <dd>{process.env.CRON_SECRET ? "Configured" : <span className="text-red-600">CRON_SECRET not set — automatic renewals won&apos;t run</span>}</dd>
            </div>
            <p className="text-xs text-black/50">Keys live in environment variables (PAYSTACK_SECRET_KEY, CRON_SECRET), never in the database. Change them in your hosting dashboard.</p>
          </dl>
        )}
      </Panel>
    </>
  );
}
