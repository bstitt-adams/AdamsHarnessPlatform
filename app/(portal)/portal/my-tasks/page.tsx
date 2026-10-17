"use client";

import { MindChukTasksWorkspace } from "@/components/portal/mindchuk-tasks-workspace";

export default function MyTasksPage() {
  return (
    <MindChukTasksWorkspace
      pageTitle="My Tasks & MindChuk Feed"
      breadcrumbLabel="My Tasks"
    />
  );
}
