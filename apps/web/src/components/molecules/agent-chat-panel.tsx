"use client";

import { useState, type FormEvent } from "react";
import { API_ENDPOINTS, getApiBaseUrl } from "@lantern/config";
import { buildApiUrl } from "@lantern/utils";
import { postChat } from "@/libs/explorer/api";

interface Turn {
  role: "user" | "assistant";
  content: string;
}

const MAX_MESSAGE_CHARS = 2000;

/**
 * Chat with an agent's LLM persona. Talks only to our own API — the OpenRouter
 * key stays server-side (apps/api), never in the browser.
 */
export function AgentChatPanel({ agentId, agentName }: { agentId: number; agentName: string }) {
  const [turns, setTurns] = useState<Turn[]>([]);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function send(event: FormEvent) {
    event.preventDefault();
    const message = input.trim();
    if (!message || busy) return;

    const history = turns.slice(-10);
    setTurns((previous) => [...previous, { role: "user", content: message }]);
    setInput("");
    setBusy(true);
    setError(null);

    const url = buildApiUrl(
      API_ENDPOINTS.AGENT_CHAT.replace(":id", String(agentId)),
      getApiBaseUrl(),
    );
    const result = await postChat(url, message, history, fetch);

    if (result.ok) {
      setTurns((previous) => [...previous, { role: "assistant", content: result.data.reply }]);
    } else {
      setError(result.error);
    }
    setBusy(false);
  }

  return (
    <section className="rounded-xl border border-paper/15 bg-paper/[0.03] p-5">
      <h2 className="font-syne text-lg text-paper">Chat with {agentName}</h2>
      <p className="mt-1 text-xs text-paper/50">
        Persona powered by the API&apos;s free-tier model on a mock profile — ask it about its
        strategy.
      </p>

      {turns.length > 0 ? (
        <ul className="mt-4 max-h-72 space-y-3 overflow-y-auto pr-1">
          {turns.map((turn, index) => (
            <li
              key={`${turn.role}-${index}`}
              className={
                turn.role === "user"
                  ? "ml-8 rounded-lg border border-lantern/30 bg-lantern/10 px-3 py-2 text-sm text-paper"
                  : "mr-8 rounded-lg border border-paper/15 bg-paper/5 px-3 py-2 text-sm text-paper/85"
              }
            >
              <span className="mb-1 block font-mono text-[10px] uppercase tracking-wide text-paper/40">
                {turn.role === "user" ? "you" : agentName}
              </span>
              {turn.content}
            </li>
          ))}
        </ul>
      ) : null}

      {error ? (
        <p className="mt-3 rounded-lg border border-red-400/40 bg-red-400/10 px-3 py-2 text-sm text-red-300">
          {error}
        </p>
      ) : null}

      <form onSubmit={send} className="mt-4 flex gap-2">
        <input
          value={input}
          onChange={(event) => setInput(event.target.value)}
          maxLength={MAX_MESSAGE_CHARS}
          placeholder={`Message ${agentName}…`}
          aria-label={`Message ${agentName}`}
          disabled={busy}
          className="min-w-0 flex-1 rounded-lg border border-paper/20 bg-ink px-3 py-2 text-sm text-paper placeholder:text-paper/35 focus:border-lantern/60 focus:outline-none disabled:opacity-60"
        />
        <button
          type="submit"
          disabled={busy || !input.trim()}
          className="shrink-0 rounded-lg border border-lantern/50 bg-lantern/15 px-4 py-2 font-mono text-sm text-lantern transition hover:bg-lantern/25 disabled:cursor-default disabled:opacity-50"
        >
          {busy ? "…" : "Send"}
        </button>
      </form>
    </section>
  );
}
