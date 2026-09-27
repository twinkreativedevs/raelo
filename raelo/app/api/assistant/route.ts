import { createHash } from "crypto";
import { NextResponse, type NextRequest } from "next/server";

import { buildSystemPrompt, getAssistantConfig, streamGroqReply, type ChatMessage } from "@/lib/assistant";
import { createAdminClient } from "@/lib/supabase/admin";

// Public chat endpoint for the landing-page assistant. Limits: 20 messages
// per visitor per 10 minutes and 600 per hour site-wide, so a script can't
// run up the Groq bill. Conversations aren't stored.

const MAX_MESSAGES = 20;
const MAX_CHARS = 1000;

function visitorKey(request: NextRequest) {
  const ip =
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "unknown";
  return createHash("sha256").update(`assistant:${ip}`).digest("hex").slice(0, 32);
}

function parseMessages(body: unknown): ChatMessage[] | null {
  const raw = (body as { messages?: unknown })?.messages;
  if (!Array.isArray(raw) || raw.length === 0) return null;
  const messages = raw.slice(-MAX_MESSAGES).map((m) => ({
    role: (m as ChatMessage)?.role,
    content: typeof (m as ChatMessage)?.content === "string" ? (m as ChatMessage).content.slice(0, MAX_CHARS) : "",
  }));
  if (messages.some((m) => (m.role !== "user" && m.role !== "assistant") || !m.content.trim())) return null;
  if (messages[messages.length - 1].role !== "user") return null;
  return messages as ChatMessage[];
}

export async function POST(request: NextRequest) {
  const config = await getAssistantConfig();
  if (!config.enabled || !process.env.GROQ_API_KEY) {
    return NextResponse.json({ error: "The assistant is offline." }, { status: 503 });
  }

  const messages = parseMessages(await request.json().catch(() => null));
  if (!messages) return NextResponse.json({ error: "Invalid request." }, { status: 400 });

  const admin = createAdminClient();
  const [visitor, global] = await Promise.all([
    admin.rpc("hit_rate_limit", { limit_key: `assistant:${visitorKey(request)}`, max_hits: 20, window_seconds: 600 }),
    admin.rpc("hit_rate_limit", { limit_key: "assistant:global", max_hits: 600, window_seconds: 3600 }),
  ]);
  if (visitor.data === false || global.data === false) {
    return NextResponse.json({ error: "You're sending messages quickly — please try again in a few minutes." }, { status: 429 });
  }

  try {
    const stream = await streamGroqReply(config, await buildSystemPrompt(config), messages);
    return new NextResponse(stream, {
      headers: { "Content-Type": "text/plain; charset=utf-8", "Cache-Control": "no-store" },
    });
  } catch (error) {
    // Most often an outdated model id: update it in Admin → Settings → AI assistant.
    console.error("assistant failed", error);
    return NextResponse.json({ error: "The assistant is unavailable right now." }, { status: 502 });
  }
}
