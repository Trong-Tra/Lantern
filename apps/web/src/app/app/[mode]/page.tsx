import { notFound } from "next/navigation";
import { metadata as globeMetadata } from "../page";
import { GlobePage } from "../globe-page";

export const metadata = globeMetadata;
export const dynamicParams = false;

export function generateStaticParams() {
  return process.env.NODE_ENV === "development"
    ? [{ mode: "demo" }, { mode: "live" }]
    : [{ mode: "demo" }];
}

export default async function GlobeModePage({
  params,
}: Readonly<{ params: Promise<{ mode: string }> }>) {
  const { mode } = await params;
  if (mode !== "demo" && !(mode === "live" && process.env.NODE_ENV === "development")) {
    notFound();
  }
  return <GlobePage demo={mode === "demo"} />;
}
