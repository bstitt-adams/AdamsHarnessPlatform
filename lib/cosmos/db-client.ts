/**
 * Browser-side shim shaped like firebase/firestore, backed by /api/db/*.
 * Swap-in target for `DATA_BACKEND=cosmos`: call sites keep
 * query/where/orderBy/limit/getDocs/addDoc/setDoc/updateDoc/deleteDoc.
 * Reads revive { __ts } into Timestamp-like objects so `.toDate()` call sites work.
 */
import { getAuth } from "firebase/auth";

type Ref = { path: string; id?: string };
type Constraint = Record<string, unknown>;
export type QueryRef = { path: string; wheres: Constraint[]; orderBys: Constraint[]; limitN?: number };

const reviver = (_k: string, v: unknown) => {
  if (v && typeof v === "object") {
    const o = v as Record<string, unknown>;
    if (typeof o.__ts === "string") {
      const d = new Date(o.__ts);
      return {
        seconds: Math.floor(d.getTime() / 1000),
        nanoseconds: (d.getTime() % 1000) * 1e6,
        toDate: () => d,
        toMillis: () => d.getTime(),
      };
    }
  }
  return v;
};

// Serialize: Date → {__ts}; sentinel objects pass through for the server.
const serializer = (_k: string, v: unknown) => (v instanceof Date ? { __ts: v.toISOString() } : v);

async function call<T>(endpoint: string, body: unknown): Promise<T> {
  const token = await getAuth().currentUser?.getIdToken();
  const res = await fetch(`/api/db/${endpoint}`, {
    method: "POST",
    headers: { "content-type": "application/json", ...(token ? { authorization: `Bearer ${token}` } : {}) },
    body: JSON.stringify(body, serializer),
  });
  const json = JSON.parse(await res.text(), reviver) as T & { error?: string };
  if (!res.ok) throw new Error(json.error || `db/${endpoint} ${res.status}`);
  return json;
}

const join = (parts: (string | Ref | undefined)[]) =>
  parts.filter((p): p is string => typeof p === "string" && p.length > 0).join("/");

export function collection(_db: unknown, ...segments: (string | Ref)[]): Ref {
  // collection(db, "projects") or collection(docRef, "items")
  const base = segments.find((s) => typeof s === "object" && s && "path" in s) as Ref | undefined;
  const strs = segments.filter((s): s is string => typeof s === "string");
  return { path: base ? `${base.path}/${join(strs)}` : join(strs) };
}

export function doc(...args: (unknown | string)[]): Ref {
  // doc(db, "projects", "id") or doc(collectionRef, "id")
  const ref = args.find((a): a is Ref => typeof a === "object" && a !== null && "path" in (a as object));
  const strs = args.filter((a): a is string => typeof a === "string");
  if (ref) {
    const id = strs[strs.length - 1];
    return { path: ref.path, id };
  }
  // doc(db, "coll", "id") → path "coll", id "id"; doc(db, "coll/id") → split
  const joined = join(strs);
  const idx = joined.lastIndexOf("/");
  return { path: joined.slice(0, idx), id: joined.slice(idx + 1) };
}

export const where = (field: string, op: string, value: unknown): Constraint => ({ field, op, value });
export const orderBy = (field: string, dir: "asc" | "desc" = "asc"): Constraint => ({ field, dir });
export const limit = (n: number): Constraint => ({ limit: n });
export const serverTimestamp = () => ({ __sv: "serverTimestamp" });
export const arrayUnion = (...items: unknown[]) => ({ __arrUnion: items });
export const arrayRemove = (...items: unknown[]) => ({ __arrRemove: items });

export function query(ref: Ref | QueryRef, ...constraints: Constraint[]): QueryRef {
  const q: QueryRef = { path: ref.path, wheres: [], orderBys: [] };
  for (const c of constraints) {
    if ("op" in c) q.wheres.push(c);
    else if ("dir" in c || ("field" in c && !("op" in c))) q.orderBys.push(c);
    else if ("limit" in c) q.limitN = c.limit as number;
  }
  return q;
}

export async function getDocs(q: QueryRef | Ref) {
  const body = "wheres" in q ? q : { path: q.path };
  const { docs } = await call<{ docs: (Record<string, unknown> & { id: string })[] }>("query", body);
  return {
    empty: docs.length === 0,
    size: docs.length,
    docs: docs.map((d) => ({ id: d.id, exists: () => true, data: () => d, ref: { path: body.path, id: d.id } })),
    forEach: (fn: (d: { id: string; data: () => Record<string, unknown> }) => void) =>
      docs.forEach((d) => fn({ id: d.id, data: () => d })),
  };
}

export async function getDoc(ref: Ref) {
  const { doc } = await call<{ doc: (Record<string, unknown> & { id: string }) | null }>("query", { path: ref.path, docId: ref.id });
  return {
    id: ref.id,
    exists: () => doc != null,
    data: () => doc ?? undefined,
    ref,
  };
}

export const addDoc = (ref: Ref, data: Record<string, unknown>) =>
  call<{ id: string }>("mutate", { op: "add", path: ref.path, data }).then((r) => ({ id: r.id, path: ref.path }));

export const setDoc = (ref: Ref, data: Record<string, unknown>, opts?: { merge?: boolean }) =>
  call("mutate", { op: "set", path: ref.path, id: ref.id, data, merge: opts?.merge !== false }).then(() => undefined);

export const updateDoc = (ref: Ref, data: Record<string, unknown>) =>
  call("mutate", { op: "update", path: ref.path, id: ref.id, data }).then(() => undefined);

export const deleteDoc = (ref: Ref) =>
  call("mutate", { op: "delete", path: ref.path, id: ref.id }).then(() => undefined);
