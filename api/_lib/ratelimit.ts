import { pipeline, redisConfigured } from "./redis.js";

// Fixed-window rate limiting. Uses Redis when available so limits hold across
// function instances; otherwise falls back to a per-instance counter.

const local = new Map<string, { count: number; resetAt: number }>();

export async function allow(bucket: string, key: string, limit: number, windowSeconds: number): Promise<boolean> {
  const id = `rl:${bucket}:${key}`;

  if (redisConfigured()) {
    try {
      const [count] = await pipeline([
        ["INCR", id],
        ["EXPIRE", id, windowSeconds, "NX"],
      ]);
      return Number(count) <= limit;
    } catch {
      // Fail open on a Redis hiccup rather than locking everyone out.
      return true;
    }
  }

  const now = Date.now();
  const entry = local.get(id);
  if (!entry || entry.resetAt < now) {
    local.set(id, { count: 1, resetAt: now + windowSeconds * 1000 });
    return true;
  }
  entry.count += 1;
  return entry.count <= limit;
}
