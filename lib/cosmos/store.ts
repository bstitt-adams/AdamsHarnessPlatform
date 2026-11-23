/**
 * Firestore-shaped queries over Cosmos DB (server-side only).
 * Path mapping mirrors the export: `coll/{id}/sub` → collection `coll__sub`
 * with `_parentId` on each doc. Deeper paths flatten the same way.
 */
import { Filter, Sort, Document } from "mongodb";
import { getCosmosDb } from "./client";

export type Where = { field: string; op: string; value: unknown };
export type OrderBy = { field: string; dir?: "asc" | "desc" };

/** `a/{id}/b` → { coll: "a__b", parentId: id }. `a/{id}/b/{id2}/c` → `a__c` parentId id2. */
export function resolvePath(path: string): { coll: string; parentId?: string } {
  const parts = path.split("/").filter(Boolean);
  if (parts.length % 2 === 0) throw new Error(`Document path passed as collection: ${path}`);
  // top-level: parts[0]; subcollection: first segment + last segment
  const coll = parts.length === 1 ? parts[0] : `${parts[0]}__${parts[parts.length - 1]}`;
  return { coll, parentId: parts.length > 1 ? parts[parts.length - 2] : undefined };
}

function whereFilter(w: Where): Filter<Document> {
  const f = w.field === "__name__" || w.field === "id" ? "_id" : w.field;
  const v = w.value;
  switch (w.op) {
    case "==": return { [f]: v };
    case "!=": return { [f]: { $ne: v } };
    case "<": return { [f]: { $lt: v } };
    case "<=": return { [f]: { $lte: v } };
    case ">": return { [f]: { $gt: v } };
    case ">=": return { [f]: { $gte: v } };
    case "in": return { [f]: { $in: v as unknown[] } };
    case "not-in": return { [f]: { $nin: v as unknown[] } };
    case "array-contains": return { [f]: v };
    case "array-contains-any": return { [f]: { $in: v as unknown[] } };
    default: throw new Error(`Unsupported where op: ${w.op}`);
  }
}

export async function queryDocs(path: string, wheres: Where[] = [], orderBys: OrderBy[] = [], lim?: number) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll, parentId } = resolvePath(path);
  const filter: Filter<Document> = {};
  if (parentId) filter._parentId = parentId;
  for (const w of wheres) Object.assign(filter, whereFilter(w));
  const sort: Sort = {};
  for (const o of orderBys) sort[o.field === "__name__" || o.field === "id" ? "_id" : o.field] = o.dir === "desc" ? -1 : 1;
  let cur = db.collection(coll).find(filter, orderBys.length ? { sort } : undefined);
  if (lim && lim > 0) cur = cur.limit(lim);
  return (await cur.toArray()).map((d) => ({ id: String(d._id), ...d }));
}

export async function getDocById(path: string, id: string) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll } = resolvePath(path);
  const d = await db.collection(coll).findOne({ _id: id as never });
  return d ? { id: String(d._id), ...d } : null;
}

export async function createDoc(path: string, data: Document) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll, parentId } = resolvePath(path);
  const id = data._id ? String(data._id) : undefined;
  const doc: Document = { ...data, ...(parentId ? { _parentId: parentId } : {}) };
  if (id) doc._id = id; else delete doc._id;
  const res = await db.collection(coll).insertOne(doc);
  return String(res.insertedId);
}

export async function setDocById(path: string, id: string, data: Document, merge = true) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll, parentId } = resolvePath(path);
  const doc: Document = { ...data, ...(parentId ? { _parentId: parentId } : {}) };
  delete doc.id; delete doc._id;
  if (merge) {
    await db.collection(coll).updateOne({ _id: id as never }, { $set: doc }, { upsert: true });
  } else {
    await db.collection(coll).replaceOne({ _id: id as never }, { ...doc, _id: id }, { upsert: true });
  }
  return id;
}

export async function updateDocById(path: string, id: string, data: Document) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll } = resolvePath(path);
  const set: Document = {};
  const addToSet: Document = {};
  const pullAll: Document = {};
  for (const [k, v] of Object.entries(data)) {
    if (k === "_id" || k === "id") continue;
    const o = v as Record<string, unknown> | null;
    if (o && typeof o === "object" && Array.isArray(o.__arrUnion)) addToSet[k] = { $each: o.__arrUnion };
    else if (o && typeof o === "object" && Array.isArray(o.__arrRemove)) pullAll[k] = o.__arrRemove;
    else set[k] = v;
  }
  const update: Document = {};
  if (Object.keys(set).length) update.$set = set;
  if (Object.keys(addToSet).length) update.$addToSet = addToSet;
  if (Object.keys(pullAll).length) update.$pullAll = pullAll;
  const res = await db.collection(coll).updateOne({ _id: id as never }, update);
  if (!res.matchedCount) throw new Error(`Doc not found: ${path}/${id}`);
  return id;
}

export async function deleteDocById(path: string, id: string) {
  const db = getCosmosDb();
  if (!db) throw new Error("Cosmos not configured");
  const { coll } = resolvePath(path);
  await db.collection(coll).deleteOne({ _id: id as never });
}
