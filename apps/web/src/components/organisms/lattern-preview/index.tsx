"use client";

import { useId, useRef, useState } from "react";
import type { FormEvent, MouseEvent } from "react";

import { AgentDialog } from "./components/agent-dialog";
import {
  DEFAULT_QUERY,
  INTENTS,
  discoverAgents,
  resolveIntent,
} from "./constants/demo-agents";
import type { AgentIntent, PreviewDialogMode } from "./types";

export interface ProductPreviewProps {
  readonly compact?: boolean;
}

const FOCUS_STYLE =
  "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-2 focus-visible:ring-offset-stone-950";

export function ProductPreview({
  compact = false,
}: Readonly<ProductPreviewProps>) {
  const inputId = useId();
  const statusId = useId();
  const [query, setQuery] = useState(DEFAULT_QUERY);
  const [submittedQuery, setSubmittedQuery] = useState("");
  const [intent, setIntent] = useState<AgentIntent | null>(null);
  const [error, setError] = useState("");
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [dialogMode, setDialogMode] = useState<PreviewDialogMode | null>(null);
  const opener = useRef<HTMLButtonElement | null>(null);
  const input = useRef<HTMLTextAreaElement | null>(null);
  const agents = intent ? discoverAgents(intent) : [];
  const selectedAgent =
    agents.find((agent) => agent.id === selectedId) ?? agents[0];

  function illuminate(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const trimmed = query.trim();
    const resolved = resolveIntent(trimmed);
    setDialogMode(null);
    setSelectedId(null);
    setIntent(null);
    setSubmittedQuery("");
    if (!trimmed) {
      setError(
        "Tell Lattern what you want to do: swap, send a payment, or bridge."
      );
      input.current?.focus();
      return;
    }
    if (!resolved) {
      setError(
        "This demo supports swaps, payments, and bridges. Try one below."
      );
      return;
    }
    setIntent(resolved);
    setSubmittedQuery(trimmed);
    setError("");
  }

  function openDialog(
    event: MouseEvent<HTMLButtonElement>,
    mode: PreviewDialogMode
  ) {
    opener.current = event.currentTarget;
    setDialogMode(mode);
  }

  function reset() {
    setQuery(DEFAULT_QUERY);
    setSubmittedQuery("");
    setIntent(null);
    setSelectedId(null);
    setError("");
    input.current?.focus();
  }

  return (
    <div className="w-full border border-amber-200/20 bg-stone-950/95 font-(family-name:--font-geist-sans) text-stone-100 shadow-2xl">
      <div className="flex items-center justify-between gap-4 border-b border-amber-200/15 px-5 py-3 sm:px-7">
        <span className="font-(family-name:--font-jetbrains-mono) text-[10px] tracking-widest text-amber-100/70 uppercase">
          Lattern / Discovery
        </span>
        <span className="flex items-center gap-2 text-[10px] text-stone-400">
          <span
            aria-hidden="true"
            className="size-1.5 rounded-full bg-amber-200"
          />
          Interactive demo
        </span>
      </div>
      <div className={compact ? "p-5 sm:p-6" : "p-5 sm:p-8"}>
        <form onSubmit={illuminate}>
          <label
            htmlFor={inputId}
            className="block text-2xl font-light tracking-tight text-amber-50 sm:text-3xl"
          >
            Ask Lattern
          </label>
          <div className="mt-5 border border-amber-200/20 bg-black/25 focus-within:border-amber-200/60">
            <textarea
              ref={input}
              id={inputId}
              rows={2}
              maxLength={240}
              value={query}
              aria-describedby={statusId}
              aria-invalid={Boolean(error)}
              onChange={(event) => {
                setQuery(event.target.value);
                setIntent(null);
                setError("");
              }}
              onKeyDown={(event) => {
                if (
                  event.key === "Enter" &&
                  !event.shiftKey &&
                  !event.nativeEvent.isComposing
                ) {
                  event.preventDefault();
                  event.currentTarget.form?.requestSubmit();
                }
              }}
              placeholder="What would you like an agent to do?"
              className={`block min-h-20 w-full resize-none bg-transparent p-4 text-base leading-relaxed text-stone-200 placeholder:text-stone-500 ${FOCUS_STYLE}`}
            />
            <div className="flex items-center justify-between gap-3 border-t border-amber-200/10 px-3 py-3 sm:px-4">
              <span className="text-[10px] text-stone-500">
                Intent → trusted path
              </span>
              <button
                type="submit"
                className={`inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-200 px-3 py-2 text-xs font-medium text-stone-950 transition-colors hover:bg-amber-100 sm:px-4 sm:text-sm ${FOCUS_STYLE}`}
              >
                Illuminate Path <span aria-hidden="true">↗</span>
              </button>
            </div>
          </div>
          {!intent && (
            <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-stone-500">
              <span>Try an intent</span>
              {(Object.keys(INTENTS) as AgentIntent[]).map((value) => (
                <button
                  key={value}
                  type="button"
                  className={`min-h-9 text-stone-400 underline decoration-amber-200/20 underline-offset-4 transition-colors hover:text-amber-100 ${FOCUS_STYLE}`}
                  onClick={() => {
                    setQuery(INTENTS[value].example);
                    setError("");
                    input.current?.focus();
                  }}
                >
                  {INTENTS[value].label}
                </button>
              ))}
            </div>
          )}
        </form>

        <p
          id={statusId}
          role="status"
          aria-live="polite"
          className={`mt-4 text-xs leading-relaxed ${error ? "text-amber-300" : "text-stone-400"}`}
        >
          {error ||
            (intent
              ? "3 trusted agents discovered · demo results"
              : "Find an agent. Inspect its signals. Follow a clear path.")}
        </p>

        {intent && selectedAgent && (
          <div className="mt-3">
            <div
              className="divide-y divide-amber-200/10 border-y border-amber-200/15"
              role="group"
              aria-label="Discovered demo agents"
            >
              {agents.map((agent) => {
                const isSelected = agent.id === selectedAgent.id;
                return (
                  <button
                    type="button"
                    key={agent.id}
                    aria-pressed={isSelected}
                    aria-label={`Select ${agent.name}, demo reputation ${agent.reputation} out of 100`}
                    onClick={() => setSelectedId(agent.id)}
                    className={`flex min-h-16 w-full items-center gap-3 px-2 py-3 text-left transition-colors sm:gap-4 ${isSelected ? "bg-amber-200/5" : "hover:bg-amber-200/3"} ${FOCUS_STYLE}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-9 shrink-0 items-center justify-center border font-(family-name:--font-jetbrains-mono) text-xs ${isSelected ? "border-amber-200/45 text-amber-100" : "border-stone-700 text-stone-500"}`}
                    >
                      {agent.glyph}
                    </span>
                    <span className="min-w-0 flex-1">
                      <span className="block text-sm text-amber-50">
                        {agent.name}
                      </span>
                      <span className="mt-1 block text-[10px] text-stone-500">
                        Identity verified · Soul active · demo
                      </span>
                    </span>
                    <span className="hidden text-right sm:block">
                      <span className="block font-(family-name:--font-jetbrains-mono) text-xs text-stone-300 tabular-nums">
                        {agent.executions.toLocaleString("en-US")}
                      </span>
                      <span className="mt-1 block text-[10px] text-stone-500">
                        executions
                      </span>
                    </span>
                    <span className="min-w-12 text-right">
                      <span className="block font-(family-name:--font-jetbrains-mono) text-lg text-amber-200 tabular-nums">
                        {agent.reputation}
                      </span>
                      <span className="block text-[9px] text-stone-500">
                        reputation
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>
            <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
              <button
                type="button"
                onClick={(event) => openDialog(event, "profile")}
                className={`min-h-11 px-1 text-xs text-stone-300 underline decoration-amber-200/35 underline-offset-4 hover:text-amber-100 ${FOCUS_STYLE}`}
              >
                View Agent <span aria-hidden="true">↗</span>
              </button>
              <button
                type="button"
                onClick={(event) => openDialog(event, "execution")}
                className={`inline-flex min-h-11 items-center gap-2 rounded-lg border border-amber-200/35 px-3 py-2 text-xs text-amber-100 transition-colors hover:bg-amber-200/10 ${FOCUS_STYLE}`}
              >
                Execute with Agent <span aria-hidden="true">→</span>
              </button>
            </div>
          </div>
        )}
        <div className="mt-4 flex items-center justify-between gap-4 border-t border-amber-200/10 pt-3">
          <p className="max-w-80 text-[10px] leading-relaxed text-stone-500">
            Fictional agents and trust signals. No wallet connection or real
            transactions.
          </p>
          <button
            type="button"
            onClick={reset}
            className={`min-h-9 shrink-0 text-[10px] text-stone-400 underline underline-offset-4 hover:text-amber-100 ${FOCUS_STYLE}`}
          >
            Reset demo
          </button>
        </div>
      </div>
      {dialogMode && selectedAgent && intent && (
        <AgentDialog
          agent={selectedAgent}
          intent={intent}
          query={submittedQuery}
          mode={dialogMode}
          onClose={() => setDialogMode(null)}
          onRestoreFocus={(event) => {
            event.preventDefault();
            opener.current?.focus();
          }}
        />
      )}
    </div>
  );
}
