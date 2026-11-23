import { NextRequest } from "next/server";
import { authErrorResponse, requireUser } from "@/lib/auth/server-auth";
import { canRead } from "@/lib/cosmos/policy";
import { getDocById, queryDocs, resolvePath, type OrderBy, type Where } from "@/lib/cosmos/store";

/**
 * POST /api/db/query — Firestore-shaped reads backed by Cosmos.
 * Body: { path, wheres?, orderBys?, limit?, docId? }
 * `docId` fetches a single doc; otherwise runs a collection query.
 * Dates serialize as { __ts: iso } for the client shim to revive.
 */
const ser = (v: unknown): unknown => {
  if (v == null || typeof v !== "object") return v;
  if (v instanceof Date) return { __ts: v.toISOString() };
  if (Array.isArray(v)) return v.map(ser);
  const o: Record<string, unknown> = {};
  for (const [k, x] of Object.entries(v as Record<string, unknown>)) o[k] = ser(x);
  return o;
};

export async function POST(request: NextRequest) {
  try {
    const actor = await requireUser(request);
    const body = (await request.json()) as {
      path: string;
      wheres?: Where[];
      orderBys?: OrderBy[];
      limit?: number;
      docId?: string;
    };
    if (!body?.path) return Response.json({ error: "path required" }, { status: 400 });
    const { coll } = resolvePath(body.path);
    if (!canRead(actor, coll)) return Response.json({ error: "Forbidden" }, { status: 403 });

    if (body.docId) {
      const doc = await getDocById(body.path, body.docId);
      return Response.json({ doc: doc ? ser(doc) : null });
    }
    const docs = await queryDocs(body.path, body.wheres, body.orderBys, body.limit);
    return Response.json({ docs: ser(docs) });
  } catch (e) {
    const authRes = authErrorResponse(e);
    if (authRes) return authRes;
    return Response.json({ error: e instanceof Error ? e.message : "Query failed" }, { status: 500 });
  }
}
