import type { Metadata } from "next";
import { Profile } from "./profile";
import "./profile.css";

export const metadata: Metadata = {
  title: "Profile | Lantern Finance",
  description: "Your assets, activity and positions, illuminated.",
};

export default async function ProfilePage({ searchParams }: { searchParams: Promise<{ mock?: string }> }) {
  const { mock } = await searchParams;
  return <Profile mock={mock === "1"} />;
}
