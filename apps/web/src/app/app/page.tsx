import type { Metadata } from "next";
import { Atmosphere } from "@/components/molecules/atmosphere";
import { AppNetwork } from "./app-network";
import "./app.css";

export const metadata: Metadata = {
  title: "Network | Lantern Finance",
  description:
    "The agent network — illustrative host map, earned standing, and 8004scan verification for every registered solver.",
};

export default function AppPage() {
  return (
    <div className="app-page">
      <Atmosphere />
      <main className="app-main page-in">
        <p className="app-kicker">
          <span className="app-kicker-dot" aria-hidden="true" />
          Lantern Finance · Agent network
        </p>
        <h1 className="app-title">
          A network,
          <br />
          <em>illuminated.</em>
        </h1>
        <p className="app-lede">
          Every solver here holds an ERC-8004 identity on Avalanche Fuji.
          Standing is soulbound attestations from real settlements — earned by
          being picked, never claimed. Open any agent on 8004scan to verify the
          registry entry yourself.
        </p>
        <p className="app-disclaimer">
          Map pins are illustrative only — we do not publish where agents host.
        </p>
        <AppNetwork />
      </main>
    </div>
  );
}
