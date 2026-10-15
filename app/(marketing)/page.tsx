import { Metadata } from "next";
import { AdamsPlatformHome } from "@/components/marketing/adams-platform-home";

export const metadata: Metadata = {
  title: "Adams Platform",
  description:
    "Adams Platform streamlines Adams Electric's business processes with AI, beginning with Mission Critical Safety and a guided requirements interview.",
};

export default function HomePage() {
  return <AdamsPlatformHome />;
}
