import { useEffect, useState } from "react";

import * as Dialog from "@radix-ui/react-dialog";

import { INTENTS } from "../constants/demo-agents";
import type { AgentIntent, DemoAgent, PreviewDialogMode } from "../types";

interface AgentDialogProps {
  readonly agent: DemoAgent;
  readonly intent: AgentIntent;
  readonly query: string;
  readonly mode: PreviewDialogMode;
  readonly onClose: () => void;
  readonly onRestoreFocus: (event: Event) => void;
}

const PRIMARY_BUTTON =
  "inline-flex min-h-11 items-center justify-center gap-2 rounded-lg bg-amber-200 px-4 py-2 text-sm font-medium text-stone-950 transition-colors hover:bg-amber-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:ring-offset-4 focus-visible:ring-offset-stone-950";

const EXECUTION_STEPS = [
  "Review permission",
  "Authorize intent",
  "Execute route",
  "Simulated confirmation",
] as const;

const ACTION_LABELS = [
  "Authorize simulation",
  "Run simulation",
  "Reveal simulated confirmation",
] as const;

export function AgentDialog({
  agent,
  intent,
  query,
  mode,
  onClose,
  onRestoreFocus,
}: Readonly<AgentDialogProps>) {
  const [step, setStep] = useState(0);
  const [showExecution, setShowExecution] = useState(mode === "execution");
  const definition = INTENTS[intent];
  const isConfirmed = step === 3;
  useEffect(() => {
    window.dispatchEvent(new CustomEvent("lattern:dialog", { detail: true }));
    return () => {
      window.dispatchEvent(
        new CustomEvent("lattern:dialog", { detail: false })
      );
    };
  }, []);
  let title = agent.name;
  if (showExecution) title = "Review your path.";
  if (isConfirmed) title = "A clear path. Confirmed.";

  return (
    <Dialog.Root open onOpenChange={(open) => !open && onClose()}>
      <Dialog.Portal>
        <Dialog.Overlay
          className="fixed inset-0 z-90 bg-black/85"
          data-lenis-prevent
        />
        <Dialog.Content
          onCloseAutoFocus={onRestoreFocus}
          className="fixed top-1/2 left-1/2 z-100 max-h-[85dvh] w-[calc(100%_-_2rem)] max-w-lg -translate-x-1/2 -translate-y-1/2 overflow-y-auto border border-amber-200/25 bg-stone-950 p-6 font-(family-name:--font-geist-sans) text-stone-100 shadow-2xl focus:outline-none sm:p-9"
          data-lenis-prevent
        >
          <div className="mb-6 flex items-center justify-between gap-4">
            <p className="font-(family-name:--font-jetbrains-mono) text-[10px] tracking-widest text-amber-200/70 uppercase">
              Lattern / Interactive demo
            </p>
            <Dialog.Close
              aria-label="Close agent details"
              className="flex min-h-11 min-w-11 items-center justify-center text-xl text-stone-400 transition-colors hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:outline-none"
            >
              ×
            </Dialog.Close>
          </div>
          <Dialog.Title className="text-3xl font-light tracking-tight text-amber-50">
            {title}
          </Dialog.Title>
          <Dialog.Description className="mt-3 text-sm leading-relaxed text-stone-400">
            {showExecution
              ? "Explore the authorization flow with fictional data. No wallet connects, no transaction is signed, and no funds move."
              : agent.description}
          </Dialog.Description>

          {!showExecution && (
            <>
              <p className="mt-6 border-b border-amber-200/15 pb-3 font-(family-name:--font-jetbrains-mono) text-xs text-stone-400">
                {agent.id}
              </p>
              <dl className="grid grid-cols-2 gap-x-6 gap-y-5 py-6 text-sm">
                {[
                  ["Reputation", `${agent.reputation} / 100`],
                  ["Executions", agent.executions.toLocaleString("en-US")],
                  ["Failed actions", String(agent.failures)],
                  ["Identity", "Verified · demo"],
                  ["Soul", "Active · demo"],
                  ["Capabilities", agent.capabilities.join(", ")],
                ].map(([label, value]) => (
                  <div key={label}>
                    <dt className="text-xs text-stone-500">{label}</dt>
                    <dd className="mt-1.5 font-(family-name:--font-jetbrains-mono) text-amber-100 capitalize tabular-nums">
                      {value}
                    </dd>
                  </div>
                ))}
              </dl>
              <p className="mb-6 border-t border-amber-200/15 pt-4 text-xs leading-relaxed text-stone-400">
                This is a fictional profile. Scores and history illustrate trust
                signals, not a guarantee of safety or live verification.
              </p>
              <button
                type="button"
                className={PRIMARY_BUTTON}
                onClick={() => setShowExecution(true)}
              >
                Execute with Agent <span aria-hidden="true">↗</span>
              </button>
            </>
          )}

          {showExecution && (
            <>
              <div className="my-6 border-y border-amber-200/15 py-5">
                <p className="mb-2 text-xs text-stone-500">Your intent</p>
                <p className="text-sm leading-relaxed text-amber-50">{query}</p>
                <p className="mt-4 text-xs text-stone-400">
                  {agent.name} <span className="mx-2 text-amber-200">→</span>
                  {definition.label}{" "}
                  <span className="mx-2 text-amber-200">→</span>
                  Monad demo
                </p>
              </div>
              <ol
                className="space-y-4"
                aria-label="Simulated execution progress"
              >
                {EXECUTION_STEPS.map((label, index) => (
                  <li
                    key={label}
                    aria-current={index === step ? "step" : undefined}
                    className={`flex items-center gap-3 text-sm ${index <= step ? "text-amber-100" : "text-stone-500"}`}
                  >
                    <span
                      aria-hidden="true"
                      className={`flex size-6 shrink-0 items-center justify-center border font-(family-name:--font-jetbrains-mono) text-[10px] ${index <= step ? "border-amber-200/45 bg-amber-200/5" : "border-stone-800"}`}
                    >
                      {index < step || isConfirmed ? "✓" : `0${index + 1}`}
                    </span>
                    {label}
                  </li>
                ))}
              </ol>
              <div aria-live="polite" aria-atomic="true" className="mt-6">
                {!isConfirmed && (
                  <p className="text-xs leading-relaxed text-stone-400">
                    {step === 0 && definition.permission}
                    {step === 1 &&
                      "Demo permission recorded. The fictional agent is ready to follow the selected path."}
                    {step === 2 &&
                      "Route simulated locally. Continue to see the example confirmation."}
                  </p>
                )}
                {isConfirmed && (
                  <p className="border-l border-amber-200/50 pl-4 text-sm leading-relaxed text-amber-100">
                    Simulation complete. Your path has been illuminated.
                    <span className="mt-1 block text-xs text-stone-400">
                      No real onchain transaction was submitted.
                    </span>
                  </p>
                )}
              </div>
              <div className="mt-6 flex flex-wrap items-center gap-4">
                {!isConfirmed && (
                  <button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={() =>
                      setStep((current) => Math.min(current + 1, 3))
                    }
                  >
                    {ACTION_LABELS[step]} <span aria-hidden="true">→</span>
                  </button>
                )}
                {isConfirmed && (
                  <button
                    type="button"
                    className={PRIMARY_BUTTON}
                    onClick={onClose}
                  >
                    Return to discovery
                  </button>
                )}
                {step > 0 && (
                  <button
                    type="button"
                    className="min-h-11 px-1 text-xs text-stone-400 underline underline-offset-4 hover:text-amber-100 focus-visible:ring-2 focus-visible:ring-amber-200 focus-visible:outline-none"
                    onClick={() => setStep(0)}
                  >
                    Restart simulation
                  </button>
                )}
              </div>
            </>
          )}
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
