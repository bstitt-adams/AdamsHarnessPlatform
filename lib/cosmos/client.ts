/**
 * Azure Cosmos DB for MongoDB — shared server-side client.
 * Mirror of lib/firebase-admin.ts: returns null when unconfigured so callers
 * can feature-flag DATA_BACKEND without crashing Firebase paths.
 */
import { MongoClient, Db } from "mongodb";

let cached: MongoClient | null = null;
let cachedDb: Db | null = null;

export function getCosmosDb(): Db | null {
  const uri = process.env.COSMOS_CONNECTION_STRING;
  if (!uri) return null;
  if (cachedDb) return cachedDb;
  cached = cached || new MongoClient(uri, { appName: "adams-platform" });
  cachedDb = cached.db(process.env.COSMOS_DB_NAME || "adams");
  return cachedDb;
}

/** Firestore-style subcollection path → flat collection name (projects/{id}/items → projects__items) */
export const cosmosCollection = (db: Db, name: string) =>
  db.collection(name.replace(/\//g, "__"));
