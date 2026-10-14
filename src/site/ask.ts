import "../styles/ask.css";
import { FAQ } from "../shared/knowledge.ts";
import { makeOrb, orbDots } from "../shared/orb.ts";
import { EMAIL_RE } from "./forms.ts";

// Ask Axis: an assistant that opens from the header on every page. It answers
// from the company briefing (via /api/ask), can take a visitor's details for
// the pilot, and can open the Studio with a demo already running.

type Role = "user" | "assistant";
interface Turn {
  role: Role;
  text: string;
  action?: "none" | "lead" | "studio" | "link";
  instruction?: string;
  href?: string;
  label?: string;
}
interface Answer extends Turn {
  suggestions?: string[];
}

const STORE = "sa_ask";
const STARTERS = ["What does Seventh Axis do?", "How much does it cost?", "Show me palletising", "Do you sell robots?"];

let turns: Turn[] = [];
let panel: HTMLElement | null = null;
let log: HTMLElement;
let chips: HTMLElement;
let input: HTMLInputElement;
let busy = false;
let headOrb: HTMLElement;

function load(): void {
  try {
    turns = JSON.parse(sessionStorage.getItem(STORE) ?? "[]");
  } catch {
    turns = [];
  }
}

function save(): void {
  try {
    sessionStorage.setItem(STORE, JSON.stringify(turns.slice(-30)));
  } catch {
    // storage blocked: the chat still works for this page
  }
}

let opener: HTMLElement | null = null;

/** Ask Axis opens from any [data-ask] control: the header button and the footer link. */
export function initAskAxis(): void {
  load();
  for (const trigger of document.querySelectorAll<HTMLElement>("[data-ask]")) {
    trigger.setAttribute("aria-haspopup", "dialog");
    trigger.addEventListener("click", (e) => {
      e.preventDefault();
      opener = trigger;
      if (panel && !panel.hidden) close();
      else open();
    });
  }
}

function open(): void {
  if (!panel) build();
  panel!.hidden = false;
  document.body.classList.add("ask-open");
  input.focus({ preventScroll: true });
  log.scrollTop = log.scrollHeight;
}

function close(): void {
  if (!panel) return;
  panel.hidden = true;
  document.body.classList.remove("ask-open");
  opener?.focus();
}

function build(): void {
  panel = document.createElement("section");
  panel.className = "ask";
  panel.setAttribute("role", "dialog");
  panel.setAttribute("aria-label", "Ask Axis, the Seventh Axis assistant");
  panel.innerHTML = `
    <header class="ask__head">
      <span class="ask__mark"></span>
      <div><p class="ask__title">Ask Axis</p><p class="ask__sub">AI assistant · EN · BM · 中文</p></div>
      <button type="button" class="ask__close" aria-label="Close">×</button>
    </header>
    <div class="ask__log" aria-live="polite"></div>
    <div class="ask__chips"></div>
    <form class="ask__form">
      <label class="visually-hidden" for="ask-input">Your question</label>
      <input id="ask-input" type="text" autocomplete="off" maxlength="600" placeholder="Ask about pricing, the demo, grants…" />
      <button type="submit" aria-label="Send">→</button>
    </form>
    <p class="ask__note">AI answers can be wrong. Messages go to Google Gemini to write replies. <a href="/privacy">Privacy</a></p>`;
  document.body.append(panel);
  headOrb = makeOrb(36);
  panel.querySelector(".ask__mark")!.replaceWith(headOrb);
  log = panel.querySelector(".ask__log")!;
  chips = panel.querySelector(".ask__chips")!;
  input = panel.querySelector("#ask-input")!;
  panel.querySelector(".ask__close")!.addEventListener("click", close);
  panel.addEventListener("keydown", (e) => {
    if (e.key === "Escape") close();
  });
  panel.querySelector("form")!.addEventListener("submit", (e) => {
    e.preventDefault();
    void ask(input.value);
  });

  if (turns.length === 0) {
    render({
      role: "assistant",
      text: "Hi, I'm Axis. Ask me how Seventh Axis works, what it costs, or say \"show me\" and I'll open the live demo.",
    });
  } else turns.forEach(render);
  setChips(STARTERS);
}

function setChips(list: string[]): void {
  chips.replaceChildren(
    ...list.map((text) => {
      const b = document.createElement("button");
      b.type = "button";
      b.textContent = text;
      b.addEventListener("click", () => void ask(text));
      return b;
    }),
  );
}

function render(turn: Turn): HTMLElement {
  const el = document.createElement("div");
  el.className = `ask__msg ask__msg--${turn.role}`;
  const p = document.createElement("p");
  p.textContent = turn.text;
  el.append(p);
  if (turn.role === "assistant" && turn.action === "studio" && turn.instruction) {
    const a = document.createElement("a");
    a.className = "ask__action";
    a.href = `/studio?q=${encodeURIComponent(turn.instruction)}`;
    a.textContent = "Open it in the Studio →";
    el.append(a);
  } else if (turn.role === "assistant" && turn.action === "link" && turn.href) {
    const a = document.createElement("a");
    a.className = "ask__action";
    a.href = turn.href;
    a.textContent = `${turn.label ?? "Open page"} →`;
    el.append(a);
  } else if (turn.role === "assistant" && turn.action === "lead") {
    el.append(leadForm());
  }
  log.append(el);
  log.scrollTop = log.scrollHeight;
  return el;
}

async function ask(question: string): Promise<void> {
  const text = question.trim();
  if (!text || busy) return;
  busy = true;
  input.value = "";
  const user: Turn = { role: "user", text };
  turns.push(user);
  render(user);
  save();
  // Axis is thinking: the header orb quickens and small orbs stand in for the reply.
  const typing = render({ role: "assistant", text: "" });
  typing.classList.add("is-typing");
  typing.replaceChildren(orbDots("Axis is thinking"));
  headOrb.classList.add("is-thinking");

  let answer: Answer;
  try {
    const res = await fetch("/api/ask", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ page: location.pathname, messages: turns.map(({ role, text }) => ({ role, text })) }),
      signal: AbortSignal.timeout(25_000),
    });
    if (!res.ok) throw new Error(String(res.status));
    const body = await res.json();
    answer = { role: "assistant", text: body.reply, action: body.action, instruction: body.instruction, href: body.href, label: body.label, suggestions: body.suggestions };
  } catch {
    answer = offline(text);
  }
  typing.remove();
  headOrb.classList.remove("is-thinking");
  const { suggestions, ...turn } = answer;
  turns.push(turn);
  render(turn);
  save();
  if (suggestions?.length) setChips(suggestions);
  busy = false;
  input.focus({ preventScroll: true });
}

/** Without the AI: the closest FAQ answer, or a nudge to the right place. */
function offline(question: string): Answer {
  const q = question.toLowerCase();
  if (/\b(show|demo|try|see|tunjuk|演示|看看)\b/.test(q)) {
    return { role: "assistant", text: "Here's the live demo cell. It opens with a palletising job running.", action: "studio", instruction: "Stack the red boxes on pallet A, three high." };
  }
  if (/\b(contact|call me|quote|start|pilot|sign up|daftar|联系|报价)\b/.test(q)) {
    return { role: "assistant", text: "Happy to set that up. Leave your details and the team will reply within a working day.", action: "lead" };
  }
  const words = q.split(/\W+/).filter((w) => w.length > 3);
  const best = FAQ.map((f) => ({ f, score: words.filter((w) => f.q.toLowerCase().includes(w) || f.a.toLowerCase().includes(w)).length }))
    .sort((a, b) => b.score - a.score)[0];
  if (best && best.score > 0) return { role: "assistant", text: best.f.a };
  return { role: "assistant", text: "I'm offline right now, but the team can answer that. Book a meeting and we'll talk it through.", action: "link", href: "/book", label: "Book a meeting" };
}

function leadForm(): HTMLElement {
  const form = document.createElement("form");
  form.className = "ask__lead";
  form.noValidate = true;
  form.innerHTML = `
    <input name="name" type="text" autocomplete="name" placeholder="Your name" maxlength="100" required />
    <input name="email" type="email" autocomplete="email" inputmode="email" placeholder="Work email" maxlength="254" required />
    <input name="company" type="text" autocomplete="organization" placeholder="Company (optional)" maxlength="120" />
    <label class="ask__consent"><input name="consent" type="checkbox" required /> <span>I agree to Seventh Axis contacting me, as described in the <a href="/privacy">privacy notice</a>.</span></label>
    <button type="submit">Send my details</button>
    <p class="ask__error" role="status"></p>`;
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    const data = new FormData(form);
    const error = form.querySelector<HTMLElement>(".ask__error")!;
    const name = String(data.get("name") ?? "").trim();
    const email = String(data.get("email") ?? "").trim();
    if (!name) return void (error.textContent = "Please add your name.");
    if (!EMAIL_RE.test(email)) return void (error.textContent = "Please add a valid work email.");
    if (data.get("consent") !== "on") return void (error.textContent = "Please tick the box so we can contact you.");
    const button = form.querySelector("button")!;
    button.disabled = true;
    error.textContent = "";
    const asked = turns.filter((t) => t.role === "user").slice(-3).map((t) => t.text).join(" / ");
    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name, email, company: String(data.get("company") ?? "").trim(), task: `Ask Axis: ${asked}`.slice(0, 600), consent: true, website: "" }),
      });
      const body = await res.json().catch(() => ({}));
      if (!res.ok || !body.ok) throw new Error(body.error ?? "failed");
      const done = document.createElement("p");
      done.className = "ask__done";
      done.textContent = body.duplicate ? "We already have your details. We'll be in touch." : "Thanks! The team will email you within one working day.";
      form.replaceWith(done);
    } catch {
      button.disabled = false;
      error.textContent = "That didn't go through. Please try again, or book a meeting instead.";
    }
  });
  return form;
}
