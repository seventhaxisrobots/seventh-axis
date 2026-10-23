import { PAGES, knowledgeText } from "../src/shared/knowledge.js";
import { generateJson, geminiConfigured } from "./_lib/gemini.js";
import { clientIp, json, readJson } from "./_lib/http.js";
import { allow } from "./_lib/ratelimit.js";

// Ask Axis: the site's assistant. It answers from the company briefing only,
// and can suggest one action: take the visitor's details or point to a page.

const SYSTEM = `You are Axis, the assistant on the Seventh Axis website. Visitors are mostly factory owners, plant managers and engineers in Malaysia, and people from maritime and security agencies.

What you know about Seventh Axis (state nothing else about the company, its customers, team or prices):
${knowledgeText()}

How to answer:
- Reply in the visitor's language: English, Bahasa Malaysia or Chinese. Manglish in, light Manglish out is fine.
- Keep it short: two to four sentences, plain words, no markdown, no bullet lists.
- If you don't know, say so and offer a meeting. Never invent customers, certifications, partners, prices or numbers.
- General questions about robotics, automation and maritime awareness in Malaysia are fine; for anything else unrelated, steer back politely.
- Not legal, financial or safety-certification advice: for those, suggest talking to the team.
- The Studio is a simulation. Seventh Axis does not sell robots.

Actions (at most one):
- "lead": the visitor shows buying interest (pricing for their site, pilot, a quote, "contact me", "how do we start"). The site then shows a short form; don't ask for their details in the text.
- "link": one page from the Pages list is the best next step. Put its path in "href" and a two-to-four word button label in "label".
- Otherwise "none".

"suggestions": up to three short follow-up questions the visitor might ask next, in their language.`;

const SCHEMA = {
  type: "object",
  properties: {
    reply: { type: "string" },
    language: { type: "string", enum: ["en", "ms", "zh"] },
    action: { type: "string", enum: ["none", "lead", "link"] },
    href: { type: "string" },
    label: { type: "string" },
    suggestions: { type: "array", items: { type: "string" } },
  },
  required: ["reply", "language", "action", "suggestions"],
} as const;

const PATHS = new Set(PAGES.map((p) => p.path));

export function GET(): Response {
  return json({ ai: geminiConfigured() });
}

export async function POST(req: Request): Promise<Response> {
  if (!geminiConfigured()) return json({ error: "assistant_unconfigured" }, 503);
  if (!(await allow("ask", clientIp(req), 25, 600))) return json({ error: "rate_limited" }, 429);

  let body: { messages?: { role?: string; text?: string }[]; page?: string };
  try {
    body = (await readJson(req, 16_000)) as typeof body;
  } catch {
    return json({ error: "invalid_input" }, 400);
  }
  const messages = (Array.isArray(body.messages) ? body.messages : [])
    .filter((m) => (m.role === "user" || m.role === "assistant") && typeof m.text === "string" && m.text.trim())
    .slice(-10)
    .map((m) => ({ role: m.role as "user" | "assistant", text: m.text!.trim().slice(0, 800) }));
  if (messages.length === 0 || messages[messages.length - 1].role !== "user") return json({ error: "invalid_input" }, 400);

  try {
    const raw = (await generateJson({
      system: SYSTEM,
      prompt: JSON.stringify({ page: typeof body.page === "string" ? body.page.slice(0, 60) : "/", conversation: messages }),
      schema: SCHEMA,
      timeoutMs: 20_000,
    })) as Record<string, unknown>;

    const text = (k: string, max: number) => (typeof raw[k] === "string" ? (raw[k] as string).trim().slice(0, max) : "");
    let action = ["lead", "link"].includes(raw.action as string) ? (raw.action as string) : "none";
    const href = text("href", 40);
    if (action === "link" && !PATHS.has(href)) action = "none";
    return json({
      reply: text("reply", 900) || "Sorry, I didn't catch that. Could you ask another way?",
      language: ["ms", "zh"].includes(raw.language as string) ? raw.language : "en",
      action,
      ...(action === "link" ? { href, label: text("label", 40) || "Open page" } : {}),
      suggestions: (Array.isArray(raw.suggestions) ? raw.suggestions : [])
        .filter((s): s is string => typeof s === "string" && s.trim().length > 0)
        .slice(0, 3)
        .map((s) => s.trim().slice(0, 90)),
    });
  } catch (err) {
    console.error("ask failed", err);
    return json({ error: "assistant_failed" }, 502);
  }
}
