import { appendFile } from "node:fs/promises";
import { clientIp, json, readJson } from "./_lib/http.js";
import { allow } from "./_lib/ratelimit.js";
import { pipeline, redisConfigured } from "./_lib/redis.js";

const INDUSTRIES = new Set(["ee", "fnb", "rubber", "furniture", "logistics", "other"]);
const ROBOTS = new Set(["none", "1-5", "6+"]);
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

export interface WaitlistEntry {
  name: string;
  email: string;
  company: string;
  industry: string;
  robots: string;
  state: string;
  task: string;
  created_at: string;
  /** Version of the privacy notice the person agreed to. */
  consent: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await readJson(req, 8_000)) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_input" }, 400);
  }

  // Bots fill every field; people never see this one.
  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true, duplicate: false });

  const text = (key: string, max: number) => (typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "");
  const entry: WaitlistEntry = {
    name: text("name", 100),
    email: text("email", 254).toLowerCase(),
    company: text("company", 120),
    industry: text("industry", 20),
    robots: text("robots", 10),
    state: text("state", 40),
    task: text("task", 600),
    created_at: new Date().toISOString(),
    consent: "privacy-notice-2026-09-30",
  };

  if (!EMAIL.test(entry.email)) return json({ ok: false, error: "invalid_email" }, 400);
  // PDPA: we only store details the person has agreed we can use.
  if (body.consent !== true) return json({ ok: false, error: "consent_required" }, 400);
  if (!entry.name || (entry.industry && !INDUSTRIES.has(entry.industry)) || (entry.robots && !ROBOTS.has(entry.robots))) {
    return json({ ok: false, error: "invalid_input" }, 400);
  }

  if (!(await allow("waitlist", clientIp(req), 5, 600))) return json({ ok: false, error: "rate_limited" }, 429);

  if (redisConfigured()) {
    try {
      const [added] = await pipeline([["SADD", "waitlist:emails", entry.email]]);
      if (Number(added) === 0) return json({ ok: true, duplicate: true });
      await pipeline([["LPUSH", "waitlist:entries", JSON.stringify(entry)]]);
      return json({ ok: true, duplicate: false });
    } catch (err) {
      console.error("waitlist write failed", err);
      return json({ ok: false, error: "storage_unavailable" }, 503);
    }
  }

  // Local development without Redis: keep sign-ups in a git-ignored file.
  if (!process.env.VERCEL) {
    await appendFile(".waitlist-dev.jsonl", JSON.stringify(entry) + "\n");
    return json({ ok: true, duplicate: false });
  }

  console.error("waitlist storage is not configured");
  return json({ ok: false, error: "storage_unavailable" }, 503);
}
