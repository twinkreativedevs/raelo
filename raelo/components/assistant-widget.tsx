"use client";

import { useEffect, useRef, useState } from "react";

type Message = { role: "user" | "assistant"; content: string };

export function AssistantWidget({ name, welcome }: { name: string; welcome: string }) {
  const [open, setOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const listRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    listRef.current?.scrollTo({ top: listRef.current.scrollHeight });
  }, [messages, open]);

  const send = async (e: React.FormEvent) => {
    e.preventDefault();
    const text = input.trim();
    if (!text || busy) return;

    const history: Message[] = [...messages, { role: "user", content: text }];
    setMessages([...history, { role: "assistant", content: "" }]);
    setInput("");
    setError(null);
    setBusy(true);

    try {
      const res = await fetch("/api/assistant", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: history }),
      });
      if (!res.ok || !res.body) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error ?? "Something went wrong.");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let reply = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        reply += decoder.decode(value, { stream: true });
        setMessages([...history, { role: "assistant", content: reply }]);
      }
      if (!reply) throw new Error("No reply. Please try again.");
    } catch (err) {
      setMessages(history);
      setError(err instanceof Error ? err.message : "Something went wrong.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="fixed bottom-4 right-4 z-50 flex flex-col items-end gap-3">
      {open && (
        <div className="flex h-[480px] max-h-[calc(100vh-6rem)] w-[min(360px,calc(100vw-2rem))] flex-col overflow-hidden rounded-2xl bg-white shadow-2xl ring-1 ring-black/10" role="dialog" aria-label={name}>
          <div className="flex items-center justify-between bg-[#080d16] px-4 py-3 text-white">
            <span className="font-bold">{name}</span>
            <button type="button" onClick={() => setOpen(false)} aria-label="Close chat" className="text-white/70 hover:text-white">✕</button>
          </div>
          <div ref={listRef} className="flex-1 space-y-3 overflow-y-auto p-4 text-sm" aria-live="polite">
            <p className="max-w-[85%] rounded-2xl rounded-tl-sm bg-black/5 px-3 py-2">{welcome}</p>
            {messages.map((m, i) => (
              <p
                key={i}
                data-role={m.role}
                className={
                  m.role === "user"
                    ? "ml-auto max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tr-sm bg-[#ed1c24] px-3 py-2 text-white"
                    : "max-w-[85%] whitespace-pre-wrap rounded-2xl rounded-tl-sm bg-black/5 px-3 py-2"
                }
              >
                {m.content || "…"}
              </p>
            ))}
            {error && <p className="text-xs text-red-600">{error}</p>}
          </div>
          <form onSubmit={send} className="flex gap-2 border-t border-black/5 p-3">
            <input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              maxLength={1000}
              placeholder="Ask about packages, pricing…"
              aria-label="Message"
              className="h-10 flex-1 rounded-full border border-black/10 px-4 text-sm outline-none focus:border-[#ed1c24]"
            />
            <button disabled={busy || !input.trim()} className="h-10 rounded-full bg-[#ed1c24] px-4 text-sm font-bold text-white disabled:opacity-50">
              Send
            </button>
          </form>
        </div>
      )}
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="rounded-full bg-[#ed1c24] px-5 py-3 text-sm font-bold text-white shadow-lg hover:bg-[#c9141b]"
      >
        {open ? "Close" : "💬 Ask us anything"}
      </button>
    </div>
  );
}
