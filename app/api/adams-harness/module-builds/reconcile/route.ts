import { NextRequest } from "next/server";
import { COLLECTIONS } from "@/lib/schema";
import { getDb } from "@/lib/adams-harness/server-store";
import { ModuleBuildDoc } from "@/lib/adams-harness/types";
import { reconcileModuleBuild } from "@/lib/adams-harness/module-builds";

const ACTIVE_STATUSES = [
  "queued",
  "generating",
  "validating",
  "preview_ready",
  "deploying",
];

export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET?.trim();
  if (!secret) {
    return Response.json({ error: "Reconcile not configured." }, { status: 503 });
  }
  const header = request.headers.get("authorization") ?? "";
  const match = /^Bearer\s+(\S+)$/.exec(header);
  if (!match || match[1] !== secret) {
    return Response.json({ error: "Unauthorized." }, { status: 401 });
  }

  try {
    const snap = await getDb().collection(COLLECTIONS.MODULE_BUILDS).get();
    const builds = snap.docs
      .map((d) => d.data() as ModuleBuildDoc)
      .filter((b) => ACTIVE_STATUSES.includes(b.status))
      .sort((a, b) => {
        const at = (a.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        const bt = (b.updatedAt as { toMillis?: () => number })?.toMillis?.() ?? 0;
        return at - bt;
      })
      .slice(0, 10);
    const results = await Promise.all(
      builds.map(async (b) => {
        try {
          const updated = await reconcileModuleBuild(b.id);
          return { id: b.id, status: updated.status };
        } catch {
          return { id: b.id, status: "error" };
        }
      }),
    );
    return Response.json({ reconciled: results.length, results });
  } catch (error) {
    console.error("Cron reconcile error:", error);
    return Response.json({ error: "Reconcile failed." }, { status: 500 });
  }
}
