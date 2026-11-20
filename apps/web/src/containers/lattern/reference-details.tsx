export function ReferenceDetails({ index }: { index: number }) {
  return [
    <></>,
    <>
      <p className="chapter-detail">
        {
          "Built by engineers from centralized exchanges · published research behind the protocol (IEEE) · ERC-8004 identity"
        }
      </p>
      <span className="ignition-signature" aria-hidden="true">
        {"LANTERN FINANCE"}
      </span>
    </>,
    <></>,
    <>
      <div className="soul-layers" aria-label="Three layers of an agent soul">
        <span>
          <i></i>
          {"ERC-8004"}
        </span>
        <span>
          <i></i>
          {"ERC-5192"}
        </span>
        <span>
          <i></i>
          {"Settlements"}
        </span>
      </div>
    </>,
    <>
      <dl className="agent-receipt">
        <div>
          <dt>{"Lantern Finance Graph"}</dt>
          <dd>{"Avalanche Fuji"}</dd>
        </div>
        <div>
          <dt>{"Nodes / edges"}</dt>
          <dd>{"5 assets · 9 pools"}</dd>
        </div>
        <div>
          <dt>{"Reserves"}</dt>
          <dd>{"Checked against chain"}</dd>
        </div>
        <div>
          <dt>{"Access"}</dt>
          <dd>{"x402 · per read"}</dd>
        </div>
        <div>
          <dt>{"Served as"}</dt>
          <dd>{"/graph/snapshot"}</dd>
        </div>
      </dl>
    </>,
    <>
      <div className="chapter-sequence" aria-label="What mints standing">
        <span>
          {"Picked "}
          <b>{"↗"}</b>
        </span>
        <span>
          {"Settled "}
          <b>{"↗"}</b>
        </span>
        <span>
          {"Attested "}
          <b>{"↗"}</b>
        </span>
        <span className="history-failed">
          {"Retracted "}
          <b>{"×"}</b>
        </span>
        <span>
          {"Earned "}
          <b>{"↗"}</b>
        </span>
        <small>{"SOULBOUND · MINTED BY THE MARKET, NEVER CLAIMED"}</small>
      </div>
    </>,
    <>
      <div className="route-intent">
        <span className="micro-label">{"YOUR INTENT"}</span>
        <p>
          {"Swap mUSDC "}
          <span>{"→"}</span>
          {" mWAVAX"}
        </p>
        <div className="route-checks">
          <span>{"× Quote past its deadline"}</span>
          <span>{"× Signer not in the registry"}</span>
          <span>{"× Reserves moved since the quote"}</span>
          <span className="route-selected">{"↗ Pick is replayed to the pool"}</span>
        </div>
      </div>
    </>,
    <>
      <div
        className="chapter-sequence"
        aria-label="How a picked quote settles"
      >
        <span>
          <i>{"01"}</i>
          {"Intent posted"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"02"}</i>
          {"Solvers quote"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"03"}</i>
          {"You pick one"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"04"}</i>
          {"Fuji settlement"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"05"}</i>
          {"Fee to the solver"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"06"}</i>
          {"Attestation minted"}
          <b>{"↗"}</b>
        </span>
        <small>{"LIVE FLOW · /EXCHANGE ON AVALANCHE FUJI"}</small>
      </div>
    </>,
    <>
      <div className="foundation-stack">
        <span>
          <i>{"01"}</i>
          {"Pool graph"}
        </span>
        <span>
          <i>{"02"}</i>
          {"Quote protocol"}
        </span>
        <span>
          <i>{"03"}</i>
          {"ERC-8004 identity"}
        </span>
        <span>
          <i>{"04"}</i>
          {"ERC-5192 record"}
        </span>
        <span>
          <i>{"05"}</i>
          {"Avalanche Fuji"}
        </span>
      </div>
    </>,
    <></>,
    <>
      <div className="chapter-paper-links">
        <span className="micro-label">{"The receipts"}</span>
        <div className="proof-receipt">
          <span className="proof-receipt__label">{"Built by"}</span>
          <p>
            {
              "Engineers out of centralized exchanges — matching engines, settlement, custody. Systems where a bad fill is a lawsuit."
            }
          </p>
        </div>
        <a
          className="proof-receipt proof-receipt--link"
          href="https://ieeexplore.ieee.org/abstract/document/11685704"
          target="_blank"
          rel="noreferrer"
        >
          <span className="proof-receipt__label">
            {"Published research"}
          </span>
          <p className="proof-receipt__cite">
            {
              "Verifiable AI Reviewers: Decentralized Skill Matching and Soulbound Reputation for Multi-Agent Peer Review."
            }
          </p>
          <span className="proof-receipt__venue">
            {"MAPR 2026 · IEEE Xplore 11685704 · 1st author ↗"}
          </span>
        </a>
      </div>
    </>,
    <></>,
  ][index];
}
