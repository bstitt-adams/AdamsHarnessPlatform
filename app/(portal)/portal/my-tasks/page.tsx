import type { Metadata } from "next";
import { MindChukTasksWorkspace } from "@/components/portal/mindchuk-tasks-workspace";

export const metadata: Metadata = {
  title: "My Tasks | Adams Platform",
  description: "Quickly capture, share, and complete Adams Electric tasks.",
  appleWebApp: {
    capable: true,
    title: "Adams Tasks",
    statusBarStyle: "default",
  },
};

export default function MyTasksPage() {
  return (
    <MindChukTasksWorkspace
      pageTitle="My Tasks & MindChuk Feed"
      breadcrumbLabel="My Tasks"
    />
  );
}
