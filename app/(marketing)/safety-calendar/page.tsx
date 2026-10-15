import { Metadata } from "next";
import { SiteChooser } from "@/components/site-calendars/display/site-chooser";

export const metadata: Metadata = {
  title: "Safety Calendar",
  description: "Adams Electric bilingual safety calendars for job sites.",
};

export default function SafetyCalendarPage() {
  return <SiteChooser />;
}
