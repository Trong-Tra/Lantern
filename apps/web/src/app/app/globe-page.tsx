import Link from "next/link";
import { PHASE_PRODUCTION_BUILD } from "next/constants";
import { getApiBaseUrl } from "@lantern/config";
import { fetchGqlAgents, toAgentRecord } from "@/libs/app/graphql";
import { rankAgents } from "@/libs/app/network";
import { loadAgentAbout } from "@/libs/app/registration";
import { AppHeadline } from "./app-headline";
import { GlobeNetwork } from "./globe-map";
import "./app.css";
import "./globe.css";

async function loadStandings() {
  try {
    const agents = await fetchGqlAgents(
      getApiBaseUrl(),
      (input, init) => fetch(input, init),
      AbortSignal.timeout(5_000),
    );
    const ranked = rankAgents(agents.map(toAgentRecord)).slice(0, 10);
    return await Promise.all(ranked.map(async (agent) => ({
      ...agent,
      about: await loadAgentAbout(agent.canonicalTokenId),
    })));
  } catch (error) {
    // A failed regeneration must leave the previous rendered page in place.
    if (process.env.NODE_ENV === "production" && process.env.NEXT_PHASE !== PHASE_PRODUCTION_BUILD) {
      throw error;
    }
    console.warn("Unable to load solver standings", error);
    return null;
  }
}

export async function GlobePage({ demo }: Readonly<{ demo: boolean }>) {
  const standings = demo ? [] : await loadStandings();
  return (
    <div className="app-page app-globe-page">
      <main className="app-main">
        <header className="app-intro">
          <AppHeadline flipUp />
          <div className="app-intro-row">
            {!demo && (
              <p>Explore the top ten solvers on Avalanche Fuji, ranked by attestations earned from settled swaps.</p>
            )}
            <Link className="app-demo-link" href={demo ? "/app?demo=0" : "/app?demo=1"}>
              {demo ? "View live network" : "View demo agents"}
            </Link>
          </div>
        </header>
        <GlobeNetwork key={demo ? "demo" : "live"} demo={demo} standings={standings} />
      </main>
    </div>
  );
}
