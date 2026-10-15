/**
 * Lightweight in-memory rate limiter for public endpoints.
 * Suitable for a single-instance deployment; per-instance on serverless.
 */
const hits = new Map<string, number[]>();
const SWEEP_INTERVAL_MS = 60_000;
let lastSweep = Date.now();

function sweep(now: number, windowMs: number) {
  if (now - lastSweep < SWEEP_INTERVAL_MS) return;
  lastSweep = now;
  for (const [key, times] of hits) {
    const fresh = times.filter((t) => now - t < windowMs);
    if (fresh.length === 0) hits.delete(key);
    else hits.set(key, fresh);
  }
}

/** Returns true when the key has exceeded `limit` requests within `windowMs`. */
export function isRateLimited(key: string, limit: number, windowMs: number): boolean {
  const now = Date.now();
  sweep(now, windowMs);
  const times = (hits.get(key) ?? []).filter((t) => now - t < windowMs);
  if (times.length >= limit) {
    hits.set(key, times);
    return true;
  }
  times.push(now);
  hits.set(key, times);
  return false;
}
