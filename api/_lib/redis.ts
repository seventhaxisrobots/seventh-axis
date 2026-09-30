// Minimal Upstash Redis REST client. The Vercel Marketplace integration sets
// KV_REST_API_URL / KV_REST_API_TOKEN; a direct Upstash setup uses the
// UPSTASH_REDIS_REST_* names.

type Command = (string | number)[];

function config(): { url: string; token: string } | null {
  const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url: url.replace(/\/$/, ""), token } : null;
}

export function redisConfigured(): boolean {
  return config() !== null;
}

export async function pipeline(commands: Command[]): Promise<unknown[]> {
  const cfg = config();
  if (!cfg) throw new Error("Redis is not configured");
  const res = await fetch(`${cfg.url}/pipeline`, {
    method: "POST",
    headers: { Authorization: `Bearer ${cfg.token}`, "Content-Type": "application/json" },
    body: JSON.stringify(commands),
  });
  if (!res.ok) throw new Error(`Redis responded ${res.status}`);
  const results = (await res.json()) as { result?: unknown; error?: string }[];
  const failed = results.find((r) => r.error);
  if (failed) throw new Error(`Redis error: ${failed.error}`);
  return results.map((r) => r.result);
}
