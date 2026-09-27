import "server-only";

import { formatMoney } from "@/lib/format";
import { createAdminClient } from "@/lib/supabase/admin";

// Public-site AI assistant backed by Groq's OpenAI-compatible API. The key
// (GROQ_API_KEY) stays on the server; the browser only talks to
// /api/assistant. GROQ_API_URL exists for tests/proxies.

export interface AssistantConfig {
  enabled: boolean;
  model: string;
  assistantName: string;
  welcomeMessage: string;
  systemPrompt: string;
}

export const DEFAULT_MODEL = "llama-3.3-70b-versatile";

export async function getAssistantConfig(): Promise<AssistantConfig> {
  const { data } = await createAdminClient().from("settings").select("value").eq("key", "ai_assistant").maybeSingle();
  const v = (data?.value ?? {}) as Record<string, unknown>;
  return {
    enabled: v.enabled === true,
    model: String(v.model || DEFAULT_MODEL),
    assistantName: String(v.assistant_name || "Raelo Assistant"),
    welcomeMessage: String(v.welcome_message || "Hi! Ask me anything about Raelo."),
    systemPrompt: String(v.system_prompt || ""),
  };
}

/** Widget config for the landing page, or null if it shouldn't show. */
export async function getPublicAssistant() {
  if (!process.env.GROQ_API_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) return null;
  try {
    const config = await getAssistantConfig();
    return config.enabled ? config : null;
  } catch {
    return null;
  }
}

/** Everything the assistant knows: live packages plus the admin's notes. */
export async function buildSystemPrompt(config: AssistantConfig) {
  const admin = createAdminClient();
  const [{ data: packages }, { data: brand }] = await Promise.all([
    admin.from("packages").select("name, slug, description, price, currency, billing_period, deliverables").eq("active", true).order("sort_order"),
    admin.from("settings").select("value").eq("key", "brand").maybeSingle(),
  ]);
  const b = (brand?.value ?? {}) as Record<string, string>;
  const site = (process.env.NEXT_PUBLIC_SITE_URL ?? "").replace(/\/$/, "");

  const packageLines = (packages ?? []).map((p) => {
    const items = Array.isArray(p.deliverables) ? (p.deliverables as string[]).join("; ") : "";
    return `- ${p.name}: ${formatMoney(Number(p.price), p.currency)} ${p.billing_period.replace("_", " ")}. ${p.description ?? ""} Includes: ${items}. Sign up: ${site}/checkout/${p.slug}`;
  });

  return [
    `You are ${config.assistantName}, the assistant on the ${b.site_name || "Raelo"} website. ${b.site_name || "Raelo"} is a done-for-you social media content subscription for businesses in Nigeria: clients subscribe monthly, complete a short brand brief, and download professionally designed posts and captions from a private portal every month.`,
    "How it works: 1) pick a package, 2) pay securely with Paystack, 3) complete the brand brief (logo, colours, audience, platforms), 4) download ready-to-post content from the portal.",
    `Current packages (prices in Naira):\n${packageLines.join("\n") || "- (none listed right now)"}`,
    `Affiliate programme: ${site}/affiliate. Client login: ${site}/auth/login.`,
    b.support_email || b.support_phone ? `Human support: ${[b.support_email, b.support_phone].filter(Boolean).join(", ")}.` : "",
    config.systemPrompt ? `Additional guidance from the ${b.site_name || "Raelo"} team:\n${config.systemPrompt}` : "",
    "Rules: be warm, concise (under 120 words unless asked for detail) and use Naira prices exactly as listed. Only answer questions about this business, social media content and the packages. Never invent policies, discounts, refunds, turnaround times or guarantees that aren't stated above; if unsure, suggest contacting support. Don't ask for payment details or passwords.",
  ]
    .filter(Boolean)
    .join("\n\n");
}

export interface ChatMessage {
  role: "user" | "assistant";
  content: string;
}

/**
 * Streams the reply as plain text chunks. Throws if Groq rejects the
 * request (e.g. an outdated model id, the usual cause of errors).
 */
export async function streamGroqReply(
  config: AssistantConfig,
  system: string,
  messages: ChatMessage[],
): Promise<ReadableStream<Uint8Array>> {
  const res = await fetch(`${process.env.GROQ_API_URL ?? "https://api.groq.com/openai/v1"}/chat/completions`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.GROQ_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      stream: true,
      temperature: 0.4,
      max_tokens: 500,
      messages: [{ role: "system", content: system }, ...messages],
    }),
    cache: "no-store",
  });

  if (!res.ok || !res.body) {
    const detail = await res.text().catch(() => "");
    throw new Error(`Groq ${res.status}: ${detail.slice(0, 300)}`);
  }

  // Groq sends Server-Sent Events: `data: {json}` lines, ending with
  // `data: [DONE]`. Forward just the text deltas.
  const decoder = new TextDecoder();
  const encoder = new TextEncoder();
  let buffer = "";
  return res.body.pipeThrough(
    new TransformStream<Uint8Array, Uint8Array>({
      transform(chunk, controller) {
        buffer += decoder.decode(chunk, { stream: true });
        const lines = buffer.split("\n");
        buffer = lines.pop() ?? "";
        for (const line of lines) {
          const data = line.trim().replace(/^data:\s*/, "");
          if (!data || data === "[DONE]" || !line.trim().startsWith("data:")) continue;
          try {
            const text = JSON.parse(data).choices?.[0]?.delta?.content;
            if (text) controller.enqueue(encoder.encode(text));
          } catch {
            // Ignore keep-alives / partial lines.
          }
        }
      },
    }),
  );
}
