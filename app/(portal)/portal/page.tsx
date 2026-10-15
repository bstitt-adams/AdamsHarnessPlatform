import { redirect } from "next/navigation";

export default function PortalPage() {
  // Redirect to command center by default
  redirect("/portal/command-center");
}
