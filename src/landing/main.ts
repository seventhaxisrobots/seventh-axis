import "../styles/base.css";
import "../styles/landing.css";

const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");

function initNav(): void {
  const nav = document.querySelector<HTMLElement>("[data-nav]");
  if (!nav) return;
  const update = () => nav.classList.toggle("is-scrolled", window.scrollY > 40);
  update();
  window.addEventListener("scroll", update, { passive: true });
}

const PHRASES: { text: string; lang: string }[] = [
  { text: "Susun kotak merah atas palet A, tiga tingkat.", lang: "ms" },
  { text: "Stack the red boxes on pallet A, three high.", lang: "en" },
  { text: "把红色箱子叠到A号托盘上，三层。", lang: "zh" },
  { text: "Boss, red boxes go pallet A, three layer can?", lang: "en-MY" },
];

function initTyper(): void {
  const el = document.querySelector<HTMLElement>("[data-typer]");
  if (!el) return;
  let index = 0;
  let timer = 0;

  const show = (i: number) => {
    const { text, lang } = PHRASES[i];
    el.lang = lang;
    if (reducedMotion.matches) {
      el.textContent = text;
      return;
    }
    const chars = Array.from(text);
    let n = 0;
    el.textContent = "";
    const step = () => {
      el.textContent = chars.slice(0, ++n).join("");
      if (n < chars.length) timer = window.setTimeout(step, 1800 / chars.length);
    };
    step();
  };

  el.lang = PHRASES[0].lang;
  window.setInterval(() => {
    window.clearTimeout(timer);
    index = (index + 1) % PHRASES.length;
    show(index);
  }, 4500);
}

function initReveal(): void {
  const items = document.querySelectorAll<HTMLElement>(".reveal");
  if (reducedMotion.matches || !("IntersectionObserver" in window)) return;
  document.documentElement.classList.add("js");
  const io = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        entry.target.classList.add("is-visible");
        io.unobserve(entry.target);
      }
    },
    { rootMargin: "0px 0px -8% 0px", threshold: 0.08 },
  );
  items.forEach((item) => io.observe(item));
}

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

type WaitlistResponse = { ok?: boolean; duplicate?: boolean; error?: string };

function initWaitlist(): void {
  const form = document.querySelector<HTMLFormElement>("[data-waitlist]");
  const card = document.querySelector<HTMLElement>("[data-form-card]");
  const status = document.querySelector<HTMLElement>("[data-status]");
  if (!form || !card || !status) return;

  const button = form.querySelector<HTMLButtonElement>("button[type=submit]")!;
  const buttonLabel = button.textContent;
  const field = (name: string) => form.elements.namedItem(name) as HTMLInputElement;

  const setError = (name: string, message: string) => {
    const input = field(name);
    const error = document.getElementById(`${input.id}-error`);
    if (!error) return;
    error.textContent = message;
    error.hidden = !message;
    if (message) {
      input.setAttribute("aria-invalid", "true");
      input.setAttribute("aria-describedby", error.id);
    } else {
      input.removeAttribute("aria-invalid");
      input.removeAttribute("aria-describedby");
    }
  };

  const validate = (): boolean => {
    const name = field("name").value.trim();
    const email = field("email").value.trim();
    setError("name", name ? "" : "Please enter your name.");
    setError("email", email ? (EMAIL_RE.test(email) ? "" : "Please enter a valid work email.") : "Please enter your work email.");
    const firstInvalid = form.querySelector<HTMLElement>("[aria-invalid=true]");
    firstInvalid?.focus();
    return !firstInvalid;
  };

  const showSuccess = (duplicate: boolean) => {
    const panel = document.createElement("div");
    panel.className = "success";
    panel.tabIndex = -1;
    panel.setAttribute("role", "status");
    panel.innerHTML = `<p class="label label--signal">Pilot waitlist</p><h3>You're on the list.</h3><p></p>`;
    panel.lastElementChild!.textContent = duplicate
      ? "We already had you. We'll be in touch."
      : "We'll email you about the pilot soon.";
    card.replaceChildren(panel);
    panel.focus();
  };

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    status.textContent = "";
    if (!validate()) return;

    const data = new FormData(form);
    const value = (key: string) => String(data.get(key) ?? "").trim();
    const payload = {
      name: value("name"),
      email: value("email"),
      company: value("company"),
      industry: value("industry"),
      robots: value("robots"),
      state: value("state"),
      task: value("task"),
      website: value("website"),
    };

    button.disabled = true;
    button.textContent = "Sending…";

    try {
      const res = await fetch("/api/waitlist", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as WaitlistResponse;

      if (res.ok && body.ok) {
        showSuccess(Boolean(body.duplicate));
        return;
      }
      if (res.status === 400 && body.error === "invalid_email") {
        setError("email", "Please enter a valid work email.");
        field("email").focus();
      } else if (res.status === 400 && body.error === "invalid_input") {
        status.textContent = "Please check the form and try again.";
      } else if (res.status === 429) {
        status.textContent = "Too many attempts. Try again in a minute.";
      } else {
        status.textContent = "Something went wrong on our side. Please try again.";
      }
    } catch {
      status.textContent = "Something went wrong on our side. Please try again.";
    }

    button.disabled = false;
    button.textContent = buttonLabel;
  });

  for (const name of ["name", "email"]) {
    field(name).addEventListener("input", () => setError(name, ""));
  }
}

initNav();
initTyper();
initReveal();
initWaitlist();
