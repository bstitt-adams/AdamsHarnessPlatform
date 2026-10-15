import { NextRequest } from "next/server";
import { runScheduledModuleWorkflows } from "@/lib/modules/scheduler";

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret) {
    return Response.json({ error: "Cron secret not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  if (header !== `Bearer ${secret}`) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }
  try {
    const result = await runScheduledModuleWorkflows();
    return Response.json(result);
  } catch (error) {
    console.error("Scheduled module workflow error:", error);
    return Response.json({ error: "Scheduler failed." }, { status: 500 });
  }
}
