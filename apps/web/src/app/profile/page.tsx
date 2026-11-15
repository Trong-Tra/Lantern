import type { Metadata } from "next";
import { Profile } from "./profile";
import "./profile.css";

export const metadata: Metadata = {
  title: "Profile | Lattern",
  description: "Your assets, activity and positions, illuminated.",
};

export default function ProfilePage() {
  return <Profile mock={process.env.NODE_ENV === "development"} />;
}
