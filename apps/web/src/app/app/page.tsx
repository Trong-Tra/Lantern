import type { Metadata } from "next";
import { GlobePage } from "./globe-page";

export const metadata: Metadata = {
  title: "Solver Globe | Lantern Finance",
  description: "Explore the leading Avalanche Fuji solvers on the Lantern Finance globe.",
};

export const revalidate = 60;

export default function AppPage() {
  return <GlobePage demo={process.env.NODE_ENV === "development"} />;
}
