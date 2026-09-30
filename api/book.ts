import { MEETING_TYPES, TIME_SLOTS, isBookableDate, type MeetingType } from "../src/shared/booking.js";
import { appendFile } from "node:fs/promises";
import { clientIp, json, readJson } from "./_lib/http.js";
import { allow } from "./_lib/ratelimit.js";
import { pipeline, redisConfigured } from "./_lib/redis.js";

const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const PHONE = /^[+\d][\d\s()-]{6,19}$/;

export interface MeetingRequest {
  type: MeetingType;
  date: string;
  time: string;
  name: string;
  email: string;
  company: string;
  phone: string;
  notes: string;
  created_at: string;
  consent: string;
}

export async function POST(req: Request): Promise<Response> {
  let body: Record<string, unknown>;
  try {
    body = (await readJson(req, 8_000)) as Record<string, unknown>;
  } catch {
    return json({ ok: false, error: "invalid_input" }, 400);
  }

  if (typeof body.website === "string" && body.website.trim() !== "") return json({ ok: true });

  const text = (key: string, max: number) => (typeof body[key] === "string" ? (body[key] as string).trim().slice(0, max) : "");
  const request: MeetingRequest = {
    type: text("type", 10) as MeetingType,
    date: text("date", 10),
    time: text("time", 5),
    name: text("name", 100),
    email: text("email", 254).toLowerCase(),
    company: text("company", 120),
    phone: text("phone", 20),
    notes: text("notes", 800),
    created_at: new Date().toISOString(),
    consent: "privacy-notice-2026-09-30",
  };

  if (!EMAIL.test(request.email)) return json({ ok: false, error: "invalid_email" }, 400);
  if (body.consent !== true) return json({ ok: false, error: "consent_required" }, 400);
  if (
    !request.name ||
    !(request.type in MEETING_TYPES) ||
    !(TIME_SLOTS as readonly string[]).includes(request.time) ||
    !isBookableDate(request.date) ||
    (request.phone && !PHONE.test(request.phone))
  ) {
    return json({ ok: false, error: "invalid_input" }, 400);
  }

  if (!(await allow("book", clientIp(req), 5, 600))) return json({ ok: false, error: "rate_limited" }, 429);

  if (redisConfigured()) {
    try {
      await pipeline([["LPUSH", "bookings:entries", JSON.stringify(request)]]);
      return json({ ok: true });
    } catch (err) {
      console.error("booking write failed", err);
      return json({ ok: false, error: "storage_unavailable" }, 503);
    }
  }

  if (!process.env.VERCEL) {
    await appendFile(".bookings-dev.jsonl", JSON.stringify(request) + "\n");
    return json({ ok: true });
  }

  console.error("booking storage is not configured");
  return json({ ok: false, error: "storage_unavailable" }, 503);
}
