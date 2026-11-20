import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AppHeadline } from "../app/app-headline";
import { SolarNetwork } from "./agent-map";
import "../app/app.css";

export const metadata: Metadata = {
  title: "Solver Network | Lantern Finance",
  description:
    "Explore the leading Lantern Finance solvers, their settlement attestations, and ERC-8004 identities on Avalanche Fuji.",
};

export default async function SolarPreviewPage({
  searchParams,
}: Readonly<{ searchParams: Promise<{ demo?: string | string[] }> }>) {
  if (process.env.NODE_ENV !== "development") notFound();
  const demo = (await searchParams).demo !== "0";
  return (
    <div className="app-page">
      <main className="app-main">
        <header className="app-intro">
          <AppHeadline />
          <div className="app-intro-row">
            <p>
              {demo
                ? "Demo preview with eight fictional solvers and sample attestations."
                : "Explore the top eight solvers on Avalanche Fuji, ranked by attestations earned from settled swaps."}
            </p>
            <Link
              className="app-demo-link"
              href={demo ? "/app-solar?demo=0" : "/app-solar?demo=1"}
            >
              {demo ? "View live network" : "View demo agents"}
            </Link>
          </div>
        </header>
        <SolarNetwork key={demo ? "demo" : "live"} demo={demo} />
      </main>
    </div>
  );
}
