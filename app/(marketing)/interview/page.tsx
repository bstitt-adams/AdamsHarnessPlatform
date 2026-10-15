import { Metadata } from "next";
import { PublicInterview } from "@/components/marketing/public-interview";

export const metadata: Metadata = {
  title: "Requirements Interview",
  description:
    "Start a guided requirements interview with Adams Platform — no sign-in required. Tell us about the process you want to improve.",
};

export default function InterviewPage() {
  return <PublicInterview />;
}
