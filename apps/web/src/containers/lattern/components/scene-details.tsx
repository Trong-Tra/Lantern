export function SceneDetails({ id }: Readonly<{ id: string }>) {
  if (id === "discover")
    return (
      <dl className="static-agent-profile">
        <div>
          <dt>Sample agent</dt>
          <dd>Agent 0x71F · illustrative data</dd>
        </div>
        <div>
          <dt>Identity</dt>
          <dd>Verified</dd>
        </div>
        <div>
          <dt>Reputation</dt>
          <dd>92 / 100</dd>
        </div>
        <div>
          <dt>Executions / failures</dt>
          <dd>2,481 / 3</dd>
        </div>
        <div>
          <dt>Soul</dt>
          <dd>Active</dd>
        </div>
      </dl>
    );
  if (id === "soul")
    return (
      <div className="soul-legend" aria-label="Three layers of an agent soul">
        {["Identity", "Reputation", "History"].map((label, i) => (
          <span key={label} data-sequence={0.285 + i * 0.021}>
            <i />
            {label}
          </span>
        ))}
      </div>
    );
  if (id === "reputation")
    return (
      <div className="history-tape" aria-label="Sample interaction history">
        <span data-sequence=".506">
          Swap <b>↗</b>
        </span>
        <span data-sequence=".518">
          Payment <b>↗</b>
        </span>
        <span data-sequence=".53">
          Bridge <b>↗</b>
        </span>
        <span data-sequence=".543" className="history-failed">
          Execution <b>×</b>
        </span>
        <span data-sequence=".556">
          Trade <b>↗</b>
        </span>
        <small>ILLUSTRATIVE ONCHAIN HISTORY</small>
      </div>
    );
  if (id === "path")
    return (
      <div className="route-intent">
        <span className="micro-label">YOUR INTENT</span>
        <p>
          Swap MON <span>→</span> USDC
        </p>
        <div className="route-checks">
          <span data-sequence=".62">× Unverified agent</span>
          <span data-sequence=".646">× Poor execution history</span>
          <span data-sequence=".6625">× Unknown reputation</span>
          <span data-sequence=".685" className="route-selected">
            ↗ Trusted route illuminated
          </span>
        </div>
      </div>
    );
  if (id === "execution")
    return (
      <div
        className="execution-ledger"
        aria-label="Illustrative execution sequence"
      >
        {[
          "User intent",
          "Lattern resolves",
          "Agent accepts",
          "Wallet authorization",
          "Monad settlement",
          "Confirmed",
        ].map((step, i) => (
          <span key={step} data-sequence={0.724 + i * 0.013}>
            <i>{String(i + 1).padStart(2, "0")}</i>
            {step}
            <b>↗</b>
          </span>
        ))}
        <small>ILLUSTRATIVE FLOW · NO LIVE TRANSACTION</small>
      </div>
    );
  if (id === "monad")
    return (
      <div className="infrastructure-stack">
        {[
          "Agent network",
          "Lattern identity",
          "Reputation layer",
          "Execution layer",
          "Monad",
        ].map((layer, i) => (
          <span key={layer} data-sequence={0.822 + i * 0.012}>
            <i>{String(i + 1).padStart(2, "0")}</i>
            {layer}
          </span>
        ))}
      </div>
    );
  return null;
}
