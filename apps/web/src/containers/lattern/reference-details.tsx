export function ReferenceDetails({ index }: { index: number }) {
  return [
    <></>,
    <>
      <p className="chapter-detail">
        {
          "Built by engineers from centralized exchanges · two papers behind the protocol (IEEE + consortium digital identity) · ERC-8004 research"
        }
      </p>
      <span className="ignition-signature" aria-hidden="true">
        {"LATTERN"}
      </span>
    </>,
    <></>,
    <>
      <div className="soul-layers" aria-label="Three layers of an agent soul">
        <span>
          <i></i>
          {"Identity"}
        </span>
        <span>
          <i></i>
          {"Reputation"}
        </span>
        <span>
          <i></i>
          {"History"}
        </span>
      </div>
    </>,
    <>
      <dl className="agent-receipt">
        <div>
          <dt>{"Sample agent"}</dt>
          <dd>{"Agent 0x71F · illustrative data"}</dd>
        </div>
        <div>
          <dt>{"Identity"}</dt>
          <dd>{"Verified"}</dd>
        </div>
        <div>
          <dt>{"Reputation"}</dt>
          <dd>{"92 / 100"}</dd>
        </div>
        <div>
          <dt>{"Executions / failures"}</dt>
          <dd>{"2,481 / 3"}</dd>
        </div>
        <div>
          <dt>{"Soul"}</dt>
          <dd>{"Active"}</dd>
        </div>
      </dl>
    </>,
    <>
      <div className="chapter-sequence" aria-label="Sample interaction history">
        <span>
          {"Swap "}
          <b>{"↗"}</b>
        </span>
        <span>
          {"Payment "}
          <b>{"↗"}</b>
        </span>
        <span>
          {"Bridge "}
          <b>{"↗"}</b>
        </span>
        <span className="history-failed">
          {"Execution "}
          <b>{"×"}</b>
        </span>
        <span>
          {"Trade "}
          <b>{"↗"}</b>
        </span>
        <small>{"ILLUSTRATIVE ONCHAIN HISTORY"}</small>
      </div>
    </>,
    <>
      <div className="route-intent">
        <span className="micro-label">{"YOUR INTENT"}</span>
        <p>
          {"Swap MON "}
          <span>{"→"}</span>
          {" CNY"}
        </p>
        <div className="route-checks">
          <span>{"× Unverified agent"}</span>
          <span>{"× Poor execution history"}</span>
          <span>{"× Unknown reputation"}</span>
          <span className="route-selected">
            {"↗ Trusted route illuminated"}
          </span>
        </div>
      </div>
    </>,
    <>
      <div
        className="chapter-sequence"
        aria-label="Illustrative execution sequence"
      >
        <span>
          <i>{"01"}</i>
          {"User intent"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"02"}</i>
          {"Lattern resolves"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"03"}</i>
          {"Agent accepts"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"04"}</i>
          {"Wallet authorization"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"05"}</i>
          {"Monad settlement"}
          <b>{"↗"}</b>
        </span>
        <span>
          <i>{"06"}</i>
          {"Confirmed"}
          <b>{"↗"}</b>
        </span>
        <small>{"ILLUSTRATIVE FLOW · THE LIVE VERSION RUNS ON /AGENT/1"}</small>
      </div>
    </>,
    <>
      <div className="foundation-stack">
        <span>
          <i>{"01"}</i>
          {"Agent network"}
        </span>
        <span>
          <i>{"02"}</i>
          {"Lattern identity"}
        </span>
        <span>
          <i>{"03"}</i>
          {"Reputation layer"}
        </span>
        <span>
          <i>{"04"}</i>
          {"Execution layer"}
        </span>
        <span>
          <i>{"05"}</i>
          {"Monad"}
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
            {"Published research · 1 / 2"}
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
        <a
          className="proof-receipt proof-receipt--link"
          href="https://ieeexplore.ieee.org/abstract/document/11231625"
          target="_blank"
          rel="noreferrer"
        >
          <span className="proof-receipt__label">
            {"Published research · 2 / 2"}
          </span>
          <p className="proof-receipt__cite">
            {
              "Lotus: A Hybrid Cross-Chain Framework for Privacy-Preserving Digital Identity."
            }
          </p>
          <span className="proof-receipt__venue">
            {"ISCIT 2025 · IEEE Xplore 11231625 · co-author ↗"}
          </span>
        </a>
      </div>
    </>,
    <></>,
  ][index];
}
