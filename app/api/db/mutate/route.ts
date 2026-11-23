import { NextRequest } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { canWrite } from "@/lib/cosmos/policy";
import { createDoc, deleteDocById, resolvePath, setDocById, updateDocById } from "@/lib/cosmos/store";

/**
 * POST /api/db/mutate — Firestore-shaped writes backed by Cosmos.
 * Body: { op: "add"|"set"|"update"|"delete", path, id?, data? }
 * Data may carry { __ts: iso } markers (revived to Date here) and the
 * sentinel { __sv: "serverTimestamp" } which resolves to now.
 */
const revive = (v: unknown): unknown => {
  if (v == null || typeof v !== "object") return v;
  if (Array.isArray(v)) return v.map(revive);
  const o = v as Record<string, unknown>;
  if (typeof o.__ts === "string") return new Date(o.__ts);
  if (o.__sv === "serverTimestamp") return new Date();
  const out: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(o)) out[k] = revive(x);
  return out;
};

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const body = (await request.json()) as {
      op: "add" | "set" | "update" | "delete";
      path: string;
      id?: string;
      data?: Record<string, unknown>;
      merge?: boolean;
    };
    if (!body?.path || !body?.op) return Response.json({ error: "path and op required" }, { status: 400 });
    const { coll } = resolvePath(body.path);
    const data = body.data ? (revive(body.data) as Record<string, unknown>) : undefined;
    if (!canWrite(actor, coll, body.id, data)) return Response.json({ error: "Forbidden" }, { status: 403 });

    switch (body.op) {
      case "add": {
        if (!data) return Response.json({ error: "data required" }, { status: 400 });
        return Response.json({ id: await createDoc(body.path, data) });
      }
      case "set": {
        if (!body.id || !data) return Response.json({ error: "id and data required" }, { status: 400 });
        return Response.json({ id: await setDocById(body.path, body.id, data, body.merge !== false) });
      }
      case "update": {
        if (!body.id || !data) return Response.json({ error: "id and data required" }, { status: 400 });
        return Response.json({ id: await updateDocById(body.path, body.id, data) });
      }
      case "delete": {
        if (!body.id) return Response.json({ error: "id required" }, { status: 400 });
        await deleteDocById(body.path, body.id);
        return Response.json({ ok: true });
      }
    }
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return Response.json({ error: e instanceof Error ? e.message : "Mutation failed" }, { status: 500 });
  }
}
