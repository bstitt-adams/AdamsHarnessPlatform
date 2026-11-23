/**
 * DATA_BACKEND feature flag — controls whether data reads/writes route to
 * Firestore (default) or the Cosmos façade. Gradual-cutover switch per the
 * Azure migration plan; "shadow" performs Firestore reads and diffs Cosmos.
 */
export type DataBackend = "firebase" | "cosmos" | "shadow";

export const DATA_BACKEND: DataBackend =
  (process.env.NEXT_PUBLIC_DATA_BACKEND as DataBackend) === "cosmos" ||
  process.env.DATA_BACKEND === "cosmos"
    ? "cosmos"
    : process.env.NEXT_PUBLIC_DATA_BACKEND === "shadow" || process.env.DATA_BACKEND === "shadow"
      ? "shadow"
      : "firebase";

export const isCosmosBackend = () => DATA_BACKEND === "cosmos";
export const isShadowMode = () => DATA_BACKEND === "shadow";
