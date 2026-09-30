// Exports pilot sign-ups and meeting requests from Upstash Redis to CSV files.
// Usage: npm run waitlist:export   (reads .env.local or the environment)

import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = (process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL)?.replace(/\/$/, "");
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Set KV_REST_API_URL and KV_REST_API_TOKEN first (npx vercel env pull .env.local).");
  process.exit(1);
}

const exports = [
  {
    key: "waitlist:entries",
    file: "waitlist",
    columns: ["created_at", "name", "email", "company", "industry", "robots", "state", "task", "consent"],
  },
  {
    key: "bookings:entries",
    file: "bookings",
    columns: ["created_at", "type", "date", "time", "name", "email", "company", "phone", "notes", "consent"],
  },
];

const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const today = new Date().toISOString().slice(0, 10);

for (const { key, file, columns } of exports) {
  const res = await fetch(`${url}/lrange/${encodeURIComponent(key)}/0/-1`, { headers: { Authorization: `Bearer ${token}` } });
  if (!res.ok) {
    console.error(`Redis responded ${res.status} for ${key}`);
    process.exit(1);
  }
  const rows = ((await res.json()).result ?? []).map((r) => JSON.parse(r)).reverse();
  const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n");
  writeFileSync(`${file}-${today}.csv`, csv + "\n");
  console.log(`Wrote ${rows.length} rows to ${file}-${today}.csv`);
}
