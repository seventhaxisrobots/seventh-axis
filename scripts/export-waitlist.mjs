// Exports the pilot waitlist from Upstash Redis to a CSV file.
// Usage: npm run waitlist:export   (reads .env.local or the environment)

import { existsSync, readFileSync, writeFileSync } from "node:fs";

if (existsSync(".env.local")) {
  for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*"?(.*?)"?\s*$/);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2];
  }
}

const url = process.env.KV_REST_API_URL ?? process.env.UPSTASH_REDIS_REST_URL;
const token = process.env.KV_REST_API_TOKEN ?? process.env.UPSTASH_REDIS_REST_TOKEN;
if (!url || !token) {
  console.error("Set KV_REST_API_URL and KV_REST_API_TOKEN (vercel env pull .env.local) first.");
  process.exit(1);
}

const res = await fetch(`${url.replace(/\/$/, "")}/lrange/waitlist:entries/0/-1`, {
  headers: { Authorization: `Bearer ${token}` },
});
if (!res.ok) {
  console.error(`Redis responded ${res.status}`);
  process.exit(1);
}

const rows = (await res.json()).result.map((r) => JSON.parse(r)).reverse();
const columns = ["created_at", "name", "email", "company", "industry", "robots", "state", "task"];
const cell = (v) => `"${String(v ?? "").replace(/"/g, '""')}"`;
const csv = [columns.join(","), ...rows.map((r) => columns.map((c) => cell(r[c])).join(","))].join("\n");

const file = `waitlist-${new Date().toISOString().slice(0, 10)}.csv`;
writeFileSync(file, csv + "\n");
console.log(`Wrote ${rows.length} sign-ups to ${file}`);
